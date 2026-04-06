import { supabase } from './supabase';
import { MOTOR_HEALTH_ENDPOINT, MOTOR_ROTEIRIZAR_ENDPOINT, MOTOR_TIMEOUT_MS } from '../config/api.config';
import { COLUNAS_OBRIGATORIAS_EXCEL } from '../constants/carteira-columns';
import type { Veiculo, Regionalidade } from '../types';

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
  dados_linha: Record<string, any>;
  status_validacao: 'valida' | 'invalida';
  erro_validacao: string | null;
}

import type { TipoRoteirizacao, ConfiguracaoFrota, PayloadMotorParametros } from '../types';

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

export interface PayloadMotor {
  rodada_id: string;
  upload_id: string;
  usuario_id: string;
  filial_id: string;
  data_base_roteirizacao: string;
  tipo_roteirizacao: string;
  filial: FilialPayload;
  carteira: Array<Record<string, any>>;
  veiculos: VeiculoPayload[];
  regionalidades: RegionalidadePayload[];
  parametros: PayloadMotorParametros;
}

export interface RespostaMotor {
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

export async function verificarHealthMotor(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for health check

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
      if (Array.isArray(filtros.uf)) {
        query = query.in('uf', filtros.uf);
      } else {
        query = query.eq('uf', filtros.uf);
      }
    }
    if (filtros.cida) {
      if (Array.isArray(filtros.cida)) {
        query = query.in('cida', filtros.cida);
      } else {
        query = query.ilike('cida', `%${filtros.cida}%`);
      }
    }
    if (filtros.filial) {
      if (Array.isArray(filtros.filial)) {
        query = query.in('filial', filtros.filial);
      } else {
        query = query.eq('filial', filtros.filial);
      }
    }
    if (filtros.destinatario) {
      if (Array.isArray(filtros.destinatario)) {
        query = query.in('destinatario', filtros.destinatario);
      } else {
        query = query.ilike('destinatario', `%${filtros.destinatario}%`);
      }
    }
    if (filtros.tomador) {
      if (Array.isArray(filtros.tomador)) {
        query = query.in('tomador', filtros.tomador);
      } else {
        query = query.ilike('tomador', `%${filtros.tomador}%`);
      }
    }
    if (filtros.mesoregiao) {
      if (Array.isArray(filtros.mesoregiao)) {
        query = query.in('mesoregiao', filtros.mesoregiao);
      } else {
        query = query.eq('mesoregiao', filtros.mesoregiao);
      }
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

  return (data || []).map(item => {
    const mappedItem: Record<string, any> = {
      'Filial': item.filial ?? '',
      'Romane': item.romane ?? '',
      'Filial (origem)': item.filial_origem ?? '',
      'Série': item.serie ?? '',
      'Nro Doc.': item.nro_doc ?? '',
      'Data Des': item.data_des ?? '',
      'Data NF': item.data_nf ?? '',
      'D.L.E.': item.dle ?? '',
      'Agendam.': item.agendam ?? '',
      'Palet': item.palet ?? '',
      'Conf': item.conf ?? '',
      'Peso': item.peso,
      'Vlr.Merc.': item.vlr_merc,
      'Qtd.': item.qtd,
      'Peso C': item.peso_c,
      'Classifi': item.classifi ?? '',
      'Tomador': item.tomador ?? '',
      'Destinatário': item.destinatario ?? '',
      'Bairro': item.bairro ?? '',
      'Cida': item.cida ?? '',
      'UF': item.uf ?? '',
      'NF / Serie': item.nf_serie ?? '',
      'Tipo Carga': item.tipo_carga ?? '',
      'Qtd.NF': item.qtd_nf,
      'Região': item.regiao ?? '',
      'Sub-Região': item.sub_regiao ?? '',
      'Ocorrências NFs': item.ocorrencias_nfs ?? '',
      'Remetente': item.remetente ?? '',
      'Observação R': item.observacao_r,
      'Ref Cliente': item.ref_cliente,
      'Cidade Dest.': item.cidade_dest ?? '',
      'Mesoregião': item.mesoregiao ?? '',
      'Agenda': item.agenda ?? '',
      'Tipo C': item.tipo_c ?? '',
      'Última': item.ultima ?? '',
      'Status': item.status ?? '',
      'Lat.': item.lat,
      'Lon.': item.lon,
      'Veiculo Exclusivo': item.veiculo_exclusivo ?? null,
      'Peso Calculado': item.peso_calculado ?? null,
      'Prioridade': item.prioridade ?? null,
    };

    return mappedItem;
  });
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

  const veiculos = veiculosFiltrados.map(v => ({
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

  const regionalidades = regionalidadesCompletas.map(r => ({
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
      usuario_id: usuarioId,
      usuario_nome: usuarioNome,
      filial_id: filialId,
      filial_nome: filialNome,
      upload_id: uploadId,
      rodada_id: rodadaId,
      data_execucao: dataBaseRoteirizacao,
      data_base_roteirizacao: dataBaseRoteirizacao,
      origem_sistema: 'sistema_1',
      modelo_roteirizacao: modeloRoteirizacao,
      tipo_roteirizacao: tipoRoteirizacao,
      configuracao_frota: configFrotaFinal,
      filtros_aplicados: filtros,
    },
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
      status: 'enviando'
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
  const { error } = await supabase
    .from('rodadas_roteirizacao')
    .update({
      resposta_recebida: resposta,
      mensagem_retorno: resposta.mensagem,
      status: 'processado',
    })
    .eq('id', rodadaId);

  if (error) {
    throw new Error(`Erro ao salvar resposta: ${error.message}`);
  }
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

  if (!payload.parametros.rodada_id || typeof payload.parametros.rodada_id !== 'string') {
    erros.push('parametros.rodada_id é obrigatório e deve ser uma string UUID');
  }

  if (!payload.parametros.data_execucao || !isValidISODate(payload.parametros.data_execucao)) {
    erros.push('parametros.data_execucao é obrigatório e deve estar no formato ISO 8601');
  }

  if (!payload.parametros.data_base_roteirizacao || !isValidISODate(payload.parametros.data_base_roteirizacao)) {
    erros.push('parametros.data_base_roteirizacao é obrigatório e deve estar no formato ISO 8601');
  }

  if (payload.parametros.origem_sistema !== 'sistema_1') {
    erros.push('parametros.origem_sistema deve ser literal "sistema_1"');
  }

  if (!payload.parametros.tipo_roteirizacao || !['carteira', 'frota'].includes(payload.parametros.tipo_roteirizacao)) {
    erros.push('parametros.tipo_roteirizacao deve ser "carteira" ou "frota"');
  }

  if (!payload.parametros.usuario_id || !payload.parametros.filial_id || !payload.parametros.upload_id) {
    erros.push('parametros.usuario_id, filial_id e upload_id são obrigatórios');
  }

  if (payload.parametros.tipo_roteirizacao === 'frota' && payload.parametros.configuracao_frota.length === 0) {
    erros.push('parametros.tipo_roteirizacao "frota" requer configuracao_frota com pelo menos 1 item');
  }

  if (payload.parametros.tipo_roteirizacao === 'carteira' && payload.parametros.configuracao_frota.length > 0) {
    erros.push('parametros.tipo_roteirizacao "carteira" deve ter configuracao_frota vazio');
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
  acao: 'roteirizacao_iniciada' | 'roteirizacao_concluida' | 'roteirizacao_erro',
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
