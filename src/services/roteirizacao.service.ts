import { supabase } from './supabase';
import { MOTOR_HEALTH_ENDPOINT, MOTOR_ROTEIRIZAR_ENDPOINT, MOTOR_TIMEOUT_MS } from '../config/api.config';
import { COLUNAS_OBRIGATORIAS_EXCEL, EXCEL_TO_DB_MAP, DB_TO_MOTOR_KEY_MAP } from '../constants/carteira-columns';
import type { Veiculo, Regionalidade, TipoRoteirizacao, ConfiguracaoFrota } from '../types';

export interface RodadaRoteirizacao {
  id: string;
  usuario_id: string;
  filial_id: string;
  upload_id: string;
  status: 'iniciado' | 'enviando' | 'processado' | 'erro';
  payload_enviado: any;
  resposta_recebida: any;
  mensagem_retorno: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarteiraItem {
  id: string;
  upload_id: string;
  dados_linha?: Record<string, any>;
  status_validacao: 'valida' | 'invalida';
  erro_validacao: string | null;
  [key: string]: any;
}

export interface VeiculoPayload {
  id: string;
  placa?: string | null;
  perfil: string;
  qtd_eixos: number;
  capacidade_peso_kg: number;
  capacidade_vol_m3: number;
  max_entregas: number;
  max_km_distancia: number;
  ocupacao_minima_perc: number;
  filial_id?: string | null;
  tipo_frota?: string | null;
  ativo: boolean;
}

export interface RegionalidadePayload {
  cidade: string;
  uf: string;
  mesorregiao: string;
  microrregiao: string;
}

export interface FilialPayload {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  latitude: number;
  longitude: number;
}

export interface PayloadMotorParametros {
  usuario_nome?: string;
  filial_nome?: string;
  modelo_roteirizacao?: string;
  filtros_aplicados?: Record<string, any>;
  origem_sistema?: string;
  callback_url?: string;
}

export interface PayloadMotor {
  rodada_id: string;
  upload_id: string;
  usuario_id: string;
  filial_id: string;
  data_base_roteirizacao: string;
  tipo_roteirizacao: TipoRoteirizacao;
  filial: FilialPayload;
  carteira: Array<Record<string, any>>;
  veiculos: VeiculoPayload[];
  regionalidades: RegionalidadePayload[];
  parametros: PayloadMotorParametros;
  configuracao_frota?: ConfiguracaoFrota[];
}

export interface RespostaMotorLegado {
  status: 'sucesso' | 'erro' | 'parcial';
  mensagem: string;
  resumo?: {
    total_carteira: number;
    total_roteirizado: number;
    total_nao_roteirizado: number;
    total_manifestos_fechados: number;
    total_manifestos_compostos: number;
    ocupacao_media_peso: number;
    ocupacao_media_volume: number;
  };
  manifestos_fechados?: any[];
  manifestos_compostos?: any[];
  nao_roteirizados?: any[];
  logs?: string[];
}

export interface RespostaMotorM8 {
  status: 'ok' | 'erro' | 'parcial';
  mensagem: string;
  pipeline_real_ate: string;
  modo_resposta: 'contrato_retorno_sistema_1_m8' | string;
  resumo_execucao?: {
    rodada_id?: string;
    upload_id?: string;
    filial_id?: string;
    usuario_id?: string;
    data_execucao?: string | null;
    origem_sistema?: string | null;
    tipo_roteirizacao?: string | null;
    modelo_roteirizacao?: string | null;
    versao_motor?: string | null;
    tempos_ms?: Record<string, number | null>;
  };
  contexto_rodada?: Record<string, any>;
  status_modulos?: Array<Record<string, any>>;
  estatisticas_roteirizacao?: Record<string, any>;
  resultados?: {
    manifestos?: any[];
    itens_manifestos?: any[];
    tentativas_m7?: any[];
  };
  auditoria?: Record<string, any>;
  motor_response_raw?: Record<string, any>;
  callback_resultado?: Record<string, any>;
}

export type RespostaMotor = RespostaMotorLegado | RespostaMotorM8;

const FILTER_TO_DB_COLUMN_MAP: Record<string, string> = {
  uf: 'uf',
  cida: 'cidade',
  cidade: 'cidade',
  destinatario: 'destin',
  tomador: 'tomad',
  mesoregiao: 'mesoregiao',
  filial: 'filial_d',
};

function isRespostaMotorM8(data: any): data is RespostaMotorM8 {
  return !!data &&
    typeof data === 'object' &&
    typeof data.status === 'string' &&
    !!data.modo_resposta &&
    !!data.resumo_execucao;
}

function getStatusRodadaFromResposta(resposta: RespostaMotor): 'processado' | 'erro' {
  if (isRespostaMotorM8(resposta)) {
    return resposta.status === 'ok' ? 'processado' : 'erro';
  }

  return resposta.status === 'erro' ? 'erro' : 'processado';
}

function sanitizePayloadValue(value: any): any {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

// Returns a Date parsed from a DB date string (yyyy-mm-dd, yyyy-mm-ddTHH:mm:ss, or ISO).
function parseDateString(value: any): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// yyyy-MM-ddTHH:mm:ss — used by data_des and data_nf
function normalizarDataIso(value: any): string | null {
  const d = parseDateString(value);
  if (!d) return null;
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

// dd/MM/yyyy — used by dle
function normalizarDataDiaMesAno(value: any): string | null {
  const d = parseDateString(value);
  if (!d) return null;
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// dd/MM/yyyy HH:mm:ss — used by agendam
function normalizarDataAgendamento(value: any): string | null {
  const d = parseDateString(value);
  if (!d) return null;
  return (
    `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` +
    ` ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

// true → "SIM", anything else → null
function normalizarCarroDedicado(value: any): string | null {
  return value === true ? 'SIM' : null;
}

// Closed map — extend when new labels are added to the DB
const PRIORIDADE_LABEL_TO_NUMBER: Record<string, number> = {
  'ALTA':  1,
  'MEDIA': 2,
  'BAIXA': 3,
};

function normalizarPrioridade(value: any): number | null {
  if (value === null || value === undefined) return null;
  return PRIORIDADE_LABEL_TO_NUMBER[String(value)] ?? null;
}

const DB_COLUMN_VALUE_NORMALIZER_MAP: Record<string, (v: any) => any> = {
  data_des:      normalizarDataIso,
  data_nf:       normalizarDataIso,
  dle:           normalizarDataDiaMesAno,
  agendam:       normalizarDataAgendamento,
  carro_dedicado: normalizarCarroDedicado,
  prioridade:    normalizarPrioridade,
};

function montarLinhaCarteiraPayload(item: CarteiraItem): Record<string, any> {
  const mappedItem: Record<string, any> = {};

  for (const excelColumn of COLUNAS_OBRIGATORIAS_EXCEL) {
    const dbColumn = EXCEL_TO_DB_MAP[excelColumn];
    const motorKey = DB_TO_MOTOR_KEY_MAP[dbColumn];
    const normalizer = DB_COLUMN_VALUE_NORMALIZER_MAP[dbColumn] ?? sanitizePayloadValue;
    mappedItem[motorKey] = normalizer(item[dbColumn]);
  }

  return mappedItem;
}

function applyArrayOrScalarFilter(
  query: any,
  column: string,
  value: any,
  mode: 'eq' | 'ilike' = 'eq'
) {
  if (value === undefined || value === null || value === '') {
    return query;
  }

  if (Array.isArray(value)) {
    const filteredValues = value.filter(v => v !== undefined && v !== null && v !== '');
    if (filteredValues.length === 0) {
      return query;
    }
    return query.in(column, filteredValues);
  }

  if (mode === 'ilike' && typeof value === 'string') {
    return query.ilike(column, `%${value}%`);
  }

  return query.eq(column, value);
}

export async function verificarHealthMotor(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(MOTOR_HEALTH_ENDPOINT, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

export async function buscarCarteiraValida(
  uploadId: string,
  filtros?: Record<string, any>
): Promise<Array<Record<string, any>>> {
  let query = supabase
    .from('carteira_itens')
    .select('*')
    .eq('upload_id', uploadId)
    .eq('status_validacao', 'valida');

  if (filtros) {
    if (filtros.uf) {
      query = applyArrayOrScalarFilter(query, FILTER_TO_DB_COLUMN_MAP.uf, filtros.uf);
    }

    if (filtros.cida) {
      query = applyArrayOrScalarFilter(query, FILTER_TO_DB_COLUMN_MAP.cida, filtros.cida, 'ilike');
    }

    if (filtros.filial) {
      query = applyArrayOrScalarFilter(query, FILTER_TO_DB_COLUMN_MAP.filial, filtros.filial);
    }

    if (filtros.destinatario) {
      query = applyArrayOrScalarFilter(query, FILTER_TO_DB_COLUMN_MAP.destinatario, filtros.destinatario, 'ilike');
    }

    if (filtros.tomador) {
      query = applyArrayOrScalarFilter(query, FILTER_TO_DB_COLUMN_MAP.tomador, filtros.tomador, 'ilike');
    }

    if (filtros.mesoregiao) {
      query = applyArrayOrScalarFilter(query, FILTER_TO_DB_COLUMN_MAP.mesoregiao, filtros.mesoregiao);
    }

    if (filtros.data_des_inicio) {
      query = query.gte('data_des', filtros.data_des_inicio);
    }
    if (filtros.data_des_fim) {
      query = query.lte('data_des', filtros.data_des_fim);
    }
    if (filtros.dle_inicio) {
      query = query.gte('dle', filtros.dle_inicio);
    }
    if (filtros.dle_fim) {
      query = query.lte('dle', filtros.dle_fim);
    }
    if (filtros.agendam_inicio) {
      query = query.gte('agendam', filtros.agendam_inicio);
    }
    if (filtros.agendam_fim) {
      query = query.lte('agendam', filtros.agendam_fim);
    }
    if (filtros.data_nf_inicio) {
      query = query.gte('data_nf', filtros.data_nf_inicio);
    }
    if (filtros.data_nf_fim) {
      query = query.lte('data_nf', filtros.data_nf_fim);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar carteira: ${error.message}`);
  }

  return (data || []).map(montarLinhaCarteiraPayload);
}

export async function buscarVeiculosAtivos(filialId: string): Promise<Veiculo[]> {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .eq('ativo', true)
    .or(`filial_id.is.null,filial_id.eq.${filialId}`);

  if (error) {
    throw new Error(`Erro ao buscar veículos: ${error.message}`);
  }

  return data || [];
}

export async function buscarRegionalidades(): Promise<Regionalidade[]> {
  const { data, error } = await supabase
    .from('regionalidades')
    .select('*');

  if (error) {
    throw new Error(`Erro ao buscar regionalidades: ${error.message}`);
  }

  return data || [];
}

export async function buscarFilialCompleta(filialId: string): Promise<FilialPayload> {
  const { data, error } = await supabase
    .from('filiais')
    .select('id, nome, cidade, uf, latitude, longitude')
    .eq('id', filialId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar filial: ${error.message}`);
  }

  if (!data) {
    throw new Error('Filial não encontrada');
  }

  if (data.latitude === null || data.latitude === undefined) {
    throw new Error('Não foi possível roteirizar porque a filial selecionada não possui latitude cadastrada.');
  }

  if (data.longitude === null || data.longitude === undefined) {
    throw new Error('Não foi possível roteirizar porque a filial selecionada não possui longitude cadastrada.');
  }

  return {
    id: data.id,
    nome: data.nome,
    cidade: data.cidade,
    uf: data.uf,
    latitude: data.latitude,
    longitude: data.longitude,
  };
}

export async function montarPayloadMotor(
  rodadaId: string,
  uploadId: string,
  filialId: string,
  usuarioId: string,
  usuarioNome: string,
  filialNome: string,
  modeloRoteirizacao: string,
  filtros: Record<string, any> = {},
  tipoRoteirizacao: TipoRoteirizacao = 'carteira',
  configuracaoFrota: ConfiguracaoFrota[] = []
): Promise<PayloadMotor> {
  const [carteira, veiculosCompletos, regionalidadesCompletas, filialCompleta] = await Promise.all([
    buscarCarteiraValida(uploadId, filtros),
    buscarVeiculosAtivos(filialId),
    buscarRegionalidades(),
    buscarFilialCompleta(filialId),
  ]);

  const dataBaseRoteirizacao = new Date().toISOString();
  const configFrotaFinal = tipoRoteirizacao === 'carteira' ? [] : configuracaoFrota;

  let veiculosFiltrados = veiculosCompletos;
  if (tipoRoteirizacao === 'frota' && configuracaoFrota.length > 0) {
    const perfisElegiveis = new Set(configuracaoFrota.map(cfg => cfg.perfil));
    veiculosFiltrados = veiculosCompletos.filter(v => perfisElegiveis.has(v.perfil));
  }

  const veiculos: VeiculoPayload[] = veiculosFiltrados.map(v => ({
    id: v.id,
    placa: v.placa,
    perfil: v.perfil,
    qtd_eixos: v.qtd_eixos,
    capacidade_peso_kg: v.capacidade_peso_kg,
    capacidade_vol_m3: v.capacidade_vol_m3,
    max_entregas: v.max_entregas,
    max_km_distancia: v.max_km_distancia,
    ocupacao_minima_perc: v.ocupacao_minima_perc,
    filial_id: v.filial_id,
    tipo_frota: v.tipo_frota,
    ativo: v.ativo,
  }));

  const regionalidades: RegionalidadePayload[] = regionalidadesCompletas.map(r => ({
    cidade: r.cidade,
    uf: r.uf,
    mesorregiao: r.mesorregiao,
    microrregiao: r.microrregiao,
  }));

  return {
    rodada_id: rodadaId,
    upload_id: uploadId,
    usuario_id: usuarioId,
    filial_id: filialId,
    data_base_roteirizacao: dataBaseRoteirizacao,
    tipo_roteirizacao: tipoRoteirizacao,
    filial: filialCompleta,
    carteira,
    veiculos,
    regionalidades,
    parametros: {
      usuario_nome: usuarioNome,
      filial_nome: filialNome,
      origem_sistema: 'sistema_1',
      modelo_roteirizacao: modeloRoteirizacao,
      filtros_aplicados: filtros,
    },
    configuracao_frota: configFrotaFinal,
  };
}

export async function enviarParaMotorPython(payload: PayloadMotor): Promise<RespostaMotor> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), MOTOR_TIMEOUT_MS);

  try {
    const response = await fetch(MOTOR_ROTEIRIZAR_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('O processamento excedeu o tempo limite de 2 minutos');
      }
      throw new Error(`Falha ao processar a roteirização: ${error.message}`);
    }

    throw new Error('Erro desconhecido ao processar a roteirização');
  }
}

export async function iniciarRodada(
  usuarioId: string,
  filialId: string,
  uploadId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('rodadas_roteirizacao')
    .insert({
      usuario_id: usuarioId,
      filial_id: filialId,
      upload_id: uploadId,
      status: 'iniciado',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao iniciar rodada: ${error.message}`);
  }

  return data.id;
}

export async function atualizarStatusRodada(
  rodadaId: string,
  status: 'enviando' | 'processado' | 'erro'
): Promise<void> {
  const { error } = await supabase
    .from('rodadas_roteirizacao')
    .update({ status })
    .eq('id', rodadaId);

  if (error) {
    throw new Error(`Erro ao atualizar status da rodada: ${error.message}`);
  }
}

export async function salvarPayloadEnviado(
  rodadaId: string,
  payload: PayloadMotor
): Promise<void> {
  const { error } = await supabase
    .from('rodadas_roteirizacao')
    .update({
      payload_enviado: payload,
      status: 'enviando',
    })
    .eq('id', rodadaId);

  if (error) {
    throw new Error(`Erro ao salvar payload: ${error.message}`);
  }
}

export async function salvarRespostaRodada(
  rodadaId: string,
  resposta: RespostaMotor
): Promise<void> {
  const statusRodada = getStatusRodadaFromResposta(resposta);

  const { error } = await supabase
    .from('rodadas_roteirizacao')
    .update({
      resposta_recebida: resposta,
      mensagem_retorno: resposta.mensagem,
      status: statusRodada,
    })
    .eq('id', rodadaId);

  if (error) {
    throw new Error(`Erro ao salvar resposta: ${error.message}`);
  }
}

function toNumberOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIntOrZero(v: any): number {
  const n = toNumberOrNull(v);
  return n === null ? 0 : Math.round(n);
}

function toStrOrNull(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function resolveMotorRaw(resposta: RespostaMotor): Record<string, any> | null {
  if (!resposta || typeof resposta !== 'object') return null;
  const asAny = resposta as any;
  if (asAny.motor_response_raw && typeof asAny.motor_response_raw === 'object') {
    return asAny.motor_response_raw;
  }
  return null;
}

export interface ContagemPersistencia {
  manifestos: number;
  itens: number;
  remanescentes: number;
  estatisticas: number;
  frete_calculado: number;
}

function mapManifestoRow(rodadaId: string, m: any): Record<string, any> {
  return {
    rodada_id: rodadaId,
    manifesto_id: toStrOrNull(m.manifesto_id) ?? '',
    origem_modulo: toStrOrNull(m.origem_manifesto_modulo),
    tipo_manifesto: toStrOrNull(m.origem_manifesto_tipo),
    veiculo_perfil: toStrOrNull(m.veiculo_perfil),
    veiculo_tipo: toStrOrNull(m.veiculo_tipo),
    exclusivo_flag: Boolean(m.veiculo_exclusivo_flag),
    peso_total: toNumberOrNull(m.peso_final_m6_2),
    km_total: toNumberOrNull(m.km_total_sequencia_paradas_m7 ?? m.km_final_m6_2),
    ocupacao: toNumberOrNull(m.ocupacao_final_m6_2 ?? m.ocupacao_entrada_perc),
    qtd_entregas: toIntOrZero(m.qtd_docs_manifesto_m7 ?? m.qtd_paradas_manifesto_m7),
    qtd_clientes: toIntOrZero(m.qtd_paradas_manifesto_m7 ?? m.qtd_cidades_manifesto_m7),
    status: 'gerado',
    sequencia_editada_flag: false,
  };
}

function mapItemRow(rodadaId: string, item: any, fallbackSeq: number): Record<string, any> {
  const seq =
    toNumberOrNull(item.ordem_entrega_parada_m7) ??
    toNumberOrNull(item.ordem_entrega_doc_m7) ??
    toNumberOrNull(item.ordem_carregamento_doc_m7) ??
    fallbackSeq;

  return {
    rodada_id: rodadaId,
    manifesto_id: toStrOrNull(item.manifesto_id) ?? '',
    sequencia_original: Math.max(1, Math.round(Number(seq))),
    sequencia_atual: Math.max(1, Math.round(Number(seq))),
    nro_documento: toStrOrNull(item.nro_documento),
    destinatario: toStrOrNull(item.destinatario),
    cidade: toStrOrNull(item.cidade ?? item.cidade_ref_m7),
    uf: toStrOrNull(item.uf ?? item.uf_ref_m7),
    peso: toNumberOrNull(item.peso_calculado ?? item.peso_kg),
    distancia_km: toNumberOrNull(
      item.distancia_origem_parada_km_m7 ?? item.distancia_rodoviaria_est_km ?? item.dist_no_anterior_km_m7
    ),
    inicio_entrega: toStrOrNull(item.inicio_entrega),
    fim_entrega: toStrOrNull(item.fim_entrega),
    latitude: toNumberOrNull(item.latitude_dest_m7 ?? item.latitude_destinatario ?? item.latitude),
    longitude: toNumberOrNull(item.longitude_dest_m7 ?? item.longitude_destinatario ?? item.longitude),
    observacoes: toStrOrNull(item.justificativa_ordem_entrega_m7),
  };
}

type GrupoRemanescente = 'nao_roteirizavel' | 'saldo_roteirizacao';

function extractRemanescentesPorGrupo(raw: Record<string, any>): { naoRoteirizaveis: any[]; saldoRoteirizacao: any[] } {
  const remanescentesObj = raw?.remanescentes;
  const naoRoteirizaveis = Array.isArray(remanescentesObj?.nao_roteirizaveis_m3)
    ? remanescentesObj.nao_roteirizaveis_m3
    : [];
  const saldoRoteirizacao = Array.isArray(remanescentesObj?.saldo_final_roteirizacao)
    ? remanescentesObj.saldo_final_roteirizacao
    : [];
  return { naoRoteirizaveis, saldoRoteirizacao };
}

function mapRemanescenteRow(rodadaId: string, r: any, grupoRemanescente: GrupoRemanescente): Record<string, any> {
  return {
    rodada_id: rodadaId,
    nro_documento: toStrOrNull(r.nro_documento),
    destinatario: toStrOrNull(r.destinatario),
    cidade: toStrOrNull(r.cidade),
    uf: toStrOrNull(r.uf),
    motivo: toStrOrNull(r.motivo ?? r.motivo_nao_roteirizado),
    etapa_origem: toStrOrNull(r.origem_etapa ?? r.etapa_origem),
    grupo_remanescente: grupoRemanescente,
    payload_apoio_json: r,
  };
}

function mapEstatisticasRow(rodadaId: string, resposta: RespostaMotor, raw: Record<string, any> | null): Record<string, any> {
  const asAny = resposta as any;
  const resumoNegocio = raw?.resumo_negocio ?? {};
  const tempos = asAny?.resumo_execucao?.tempos_ms ?? {};

  const totalManifestos = toIntOrZero(resumoNegocio.total_manifestos_m7 ?? resumoNegocio.total_manifestos_base_m6);
  const totalRoteirizados = toIntOrZero(resumoNegocio.total_itens_manifestos_sequenciados_m7 ?? resumoNegocio.total_itens_manifestos_m6_2);
  const totalRemanescente = toIntOrZero(resumoNegocio.total_remanescente_m6_2 ?? resumoNegocio.total_remanescente_m5_4);
  const totalCarteira = toIntOrZero(resumoNegocio.total_carteira);

  return {
    rodada_id: rodadaId,
    total_carteira: totalCarteira,
    total_roteirizado: totalRoteirizados,
    total_remanescente: totalRemanescente,
    total_manifestos: totalManifestos,
    km_total: null,
    ocupacao_media: null,
    tempo_execucao_ms: toNumberOrNull(tempos.tempo_total_pipeline_ms),
    resumo_modulos_json: asAny?.status_modulos ?? null,
  };
}

async function contarRegistros(tabela: string, rodadaId: string): Promise<number> {
  const { count, error } = await supabase
    .from(tabela)
    .select('*', { count: 'exact', head: true })
    .eq('rodada_id', rodadaId);
  if (error) {
    console.error(`[persistirResultadoRodada] contar ${tabela}`, error.message);
    return -1;
  }
  return count ?? 0;
}

export async function persistirResultadoRodada(
  rodadaId: string,
  resposta: RespostaMotor
): Promise<ContagemPersistencia> {
  const contagem: ContagemPersistencia = {
    manifestos: 0,
    itens: 0,
    remanescentes: 0,
    estatisticas: 0,
    frete_calculado: 0,
  };

  const raw = resolveMotorRaw(resposta);
  if (!raw) {
    const msg = 'FALHA_PERSISTENCIA::ETAPA=validacao::motor_response_raw ausente no retorno';
    console.error('[persistirResultadoRodada]', msg);
    throw new Error(msg);
  }

  const manifestosArr = raw.manifestos_m7;
  const itensArr = raw.itens_manifestos_sequenciados_m7;
  console.info('[persistirResultadoRodada] rodada=', rodadaId,
    'manifestos_m7=', Array.isArray(manifestosArr) ? manifestosArr.length : 'ausente',
    'itens_m7=', Array.isArray(itensArr) ? itensArr.length : 'ausente');

  // --- Limpeza idempotente (etapa cleanup) ---
  try {
    await supabase.from('manifestos_itens').delete().eq('rodada_id', rodadaId);
    await supabase.from('manifestos_roteirizacao').delete().eq('rodada_id', rodadaId);
    await supabase.from('remanescentes_roteirizacao').delete().eq('rodada_id', rodadaId);
    await supabase.from('estatisticas_roteirizacao').delete().eq('rodada_id', rodadaId);
  } catch (err) {
    const msg = `FALHA_PERSISTENCIA::ETAPA=cleanup::${err instanceof Error ? err.message : String(err)}`;
    console.error('[persistirResultadoRodada]', msg);
    throw new Error(msg);
  }

  // --- Etapa manifestos ---
  try {
    if (!Array.isArray(manifestosArr)) {
      throw new Error('motor_response_raw.manifestos_m7 não é um array');
    }
    if (manifestosArr.length > 0) {
      const rows = manifestosArr
        .map((m: any) => mapManifestoRow(rodadaId, m))
        .filter((r) => r.manifesto_id);
      if (rows.length > 0) {
        const { error } = await supabase.from('manifestos_roteirizacao').insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    contagem.manifestos = await contarRegistros('manifestos_roteirizacao', rodadaId);
    console.info('[persistirResultadoRodada] etapa=manifestos gravados=', contagem.manifestos);
  } catch (err) {
    const msg = `FALHA_PERSISTENCIA::ETAPA=manifestos::${err instanceof Error ? err.message : String(err)}`;
    console.error('[persistirResultadoRodada]', msg);
    throw new Error(msg);
  }

  // --- Etapa itens ---
  try {
    if (!Array.isArray(itensArr)) {
      throw new Error('motor_response_raw.itens_manifestos_sequenciados_m7 não é um array');
    }
    if (itensArr.length > 0) {
      const perManifestCounter: Record<string, number> = {};
      const rows = itensArr
        .map((it: any) => {
          const mid = toStrOrNull(it.manifesto_id) ?? '';
          perManifestCounter[mid] = (perManifestCounter[mid] ?? 0) + 1;
          return mapItemRow(rodadaId, it, perManifestCounter[mid]);
        })
        .filter((r) => r.manifesto_id);

      if (rows.length > 0) {
        const { error } = await supabase.from('manifestos_itens').insert(rows);
        if (error) throw new Error(error.message);
      }
    }
    contagem.itens = await contarRegistros('manifestos_itens', rodadaId);
    console.info('[persistirResultadoRodada] etapa=itens gravados=', contagem.itens);
  } catch (err) {
    const msg = `FALHA_PERSISTENCIA::ETAPA=itens::${err instanceof Error ? err.message : String(err)}`;
    console.error('[persistirResultadoRodada]', msg);
    throw new Error(msg);
  }

  // --- Etapa remanescentes ---
  try {
    const { naoRoteirizaveis, saldoRoteirizacao } = extractRemanescentesPorGrupo(raw);
    console.info('[persistirResultadoRodada] remanescentes.nao_roteirizaveis_m3 =', naoRoteirizaveis.length);
    console.info('[persistirResultadoRodada] remanescentes.saldo_final_roteirizacao =', saldoRoteirizacao.length);

    const rows = [
      ...naoRoteirizaveis.map((r: any) => mapRemanescenteRow(rodadaId, r, 'nao_roteirizavel')),
      ...saldoRoteirizacao.map((r: any) => mapRemanescenteRow(rodadaId, r, 'saldo_roteirizacao')),
    ];

    if (rows.length > 0) {
      const { error } = await supabase.from('remanescentes_roteirizacao').insert(rows);
      if (error) throw new Error(error.message);
    } else {
      console.info('[persistirResultadoRodada] remanescentes vazios: nao_roteirizaveis_m3 e saldo_final_roteirizacao sem itens.');
    }

    contagem.remanescentes = await contarRegistros('remanescentes_roteirizacao', rodadaId);
    console.info('[persistirResultadoRodada] remanescentes gravados total =', contagem.remanescentes);
  } catch (err) {
    const msg = `FALHA_PERSISTENCIA::ETAPA=remanescentes::${err instanceof Error ? err.message : String(err)}`;
    console.error('[persistirResultadoRodada]', msg);
    throw new Error(msg);
  }

  // --- Etapa estatísticas ---
  try {
    const statsRow = mapEstatisticasRow(rodadaId, resposta, raw);
    const { error } = await supabase.from('estatisticas_roteirizacao').insert(statsRow);
    if (error) throw new Error(error.message);
    contagem.estatisticas = await contarRegistros('estatisticas_roteirizacao', rodadaId);
    console.info('[persistirResultadoRodada] etapa=estatisticas gravados=', contagem.estatisticas);
  } catch (err) {
    const msg = `FALHA_PERSISTENCIA::ETAPA=estatisticas::${err instanceof Error ? err.message : String(err)}`;
    console.error('[persistirResultadoRodada]', msg);
    throw new Error(msg);
  }

  console.info(
    '[persistirResultadoRodada] CONCLUIDO rodada=', rodadaId,
    'contagens=', contagem
  );
  return contagem;
}

export async function reprocessarPersistenciaRodada(rodadaId: string): Promise<ContagemPersistencia> {
  const { data, error } = await supabase
    .from('rodadas_roteirizacao')
    .select('resposta_recebida')
    .eq('id', rodadaId)
    .maybeSingle();

  if (error) throw new Error(`Erro ao buscar rodada: ${error.message}`);
  if (!data || !data.resposta_recebida) {
    throw new Error('Rodada não possui resposta_recebida para reprocessar.');
  }

  return persistirResultadoRodada(rodadaId, data.resposta_recebida as RespostaMotor);
}

export async function registrarErroRodada(
  rodadaId: string,
  mensagemErro: string
): Promise<void> {
  const { error } = await supabase
    .from('rodadas_roteirizacao')
    .update({
      mensagem_retorno: mensagemErro,
      status: 'erro',
    })
    .eq('id', rodadaId);

  if (error) {
    throw new Error(`Erro ao registrar erro da rodada: ${error.message}`);
  }
}

export async function buscarRodadasPorUsuario(usuarioId: string): Promise<RodadaRoteirizacao[]> {
  const { data, error } = await supabase
    .from('rodadas_roteirizacao')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Erro ao buscar rodadas: ${error.message}`);
  }

  return data || [];
}

export async function buscarRodadasPorFilial(filialId: string): Promise<RodadaRoteirizacao[]> {
  const { data, error } = await supabase
    .from('rodadas_roteirizacao')
    .select('*')
    .eq('filial_id', filialId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Erro ao buscar rodadas da filial: ${error.message}`);
  }

  return data || [];
}

export async function buscarRodadaPorId(rodadaId: string): Promise<RodadaRoteirizacao | null> {
  const { data, error } = await supabase
    .from('rodadas_roteirizacao')
    .select('*')
    .eq('id', rodadaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar rodada: ${error.message}`);
  }

  return data;
}

export interface ValidacaoPayload {
  valido: boolean;
  erros: string[];
}

export function validarPayloadAntesDenvio(payload: PayloadMotor): ValidacaoPayload {
  const erros: string[] = [];

  if (!payload.rodada_id || typeof payload.rodada_id !== 'string') {
    erros.push('rodada_id (topo) é obrigatório e deve ser uma string UUID');
  }

  if (!payload.upload_id || typeof payload.upload_id !== 'string') {
    erros.push('upload_id (topo) é obrigatório e deve ser uma string UUID');
  }

  if (!payload.usuario_id || typeof payload.usuario_id !== 'string') {
    erros.push('usuario_id (topo) é obrigatório e deve ser uma string UUID');
  }

  if (!payload.filial_id || typeof payload.filial_id !== 'string') {
    erros.push('filial_id (topo) é obrigatório e deve ser uma string UUID');
  }

  if (!payload.data_base_roteirizacao || !isValidISODate(payload.data_base_roteirizacao)) {
    erros.push('data_base_roteirizacao (topo) é obrigatório e deve estar no formato ISO 8601');
  }

  if (!payload.tipo_roteirizacao || !['carteira', 'frota'].includes(payload.tipo_roteirizacao)) {
    erros.push('tipo_roteirizacao (topo) deve ser "carteira" ou "frota"');
  }

  if (!payload.filial) {
    erros.push('bloco filial é obrigatório');
  } else {
    if (!payload.filial.id) {
      erros.push('filial.id é obrigatório');
    }
    if (!payload.filial.nome) {
      erros.push('filial.nome é obrigatório');
    }
    if (!payload.filial.cidade) {
      erros.push('filial.cidade é obrigatório');
    }
    if (!payload.filial.uf) {
      erros.push('filial.uf é obrigatório');
    }
    if (payload.filial.latitude === null || payload.filial.latitude === undefined) {
      erros.push('filial.latitude é obrigatório e deve ser um número válido');
    }
    if (payload.filial.longitude === null || payload.filial.longitude === undefined) {
      erros.push('filial.longitude é obrigatório e deve ser um número válido');
    }
  }

  if (!payload.parametros || typeof payload.parametros !== 'object') {
    erros.push('parametros é obrigatório');
  }

  if (payload.parametros?.origem_sistema && payload.parametros.origem_sistema !== 'sistema_1') {
    erros.push('parametros.origem_sistema deve ser literal "sistema_1" quando informado');
  }

  if (payload.tipo_roteirizacao === 'frota' && (!payload.configuracao_frota || payload.configuracao_frota.length === 0)) {
    erros.push('tipo_roteirizacao "frota" requer configuracao_frota no topo com pelo menos 1 item');
  }

  if (payload.tipo_roteirizacao === 'carteira' && payload.configuracao_frota && payload.configuracao_frota.length > 0) {
    erros.push('tipo_roteirizacao "carteira" deve ter configuracao_frota vazio');
  }

  return {
    valido: erros.length === 0,
    erros,
  };
}

function isValidISODate(dateString: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  if (!isoDateRegex.test(dateString)) {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export async function registrarAuditoriaRoteirizacao(
  acao: 'roteirizacao_iniciada' | 'roteirizacao_concluida' | 'roteirizacao_erro' | 'callback_motor_recebido',
  metadados: Record<string, any>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('auditoria_roteirizacao')
      .insert({
        acao,
        usuario_id: metadados.usuario_id || null,
        upload_id: metadados.upload_id || null,
        rodada_id: metadados.rodada_id || null,
        metadados,
      });

    if (error) {
      console.error('Erro ao registrar auditoria:', error);
    }
  } catch (err) {
    console.error('Falha ao registrar auditoria:', err);
  }
}
