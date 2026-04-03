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

import type { TipoRoteirizacao, ConfiguracaoFrota } from '../types';

export interface PayloadMotor {
  carteira: Array<Record<string, any>>;
  veiculos: Veiculo[];
  regionalidades: Regionalidade[];
  parametros: {
    usuario_id: string;
    usuario_nome: string;
    filial_id: string;
    filial_nome: string;
    upload_id: string;
    data_execucao: string;
    modelo_roteirizacao: string;
    filtros_aplicados: Record<string, any>;
    origem_sistema: string;
    tipo_roteirizacao: TipoRoteirizacao;
    configuracao_frota: ConfiguracaoFrota[];
  };
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
      query = query.eq('uf', filtros.uf);
    }
    if (filtros.cida) {
      query = query.ilike('cida', `%${filtros.cida}%`);
    }
    if (filtros.filial) {
      query = query.eq('filial', filtros.filial);
    }
    if (filtros.destinatario) {
      query = query.ilike('destinatario', `%${filtros.destinatario}%`);
    }
    if (filtros.tomador) {
      query = query.ilike('tomador', `%${filtros.tomador}%`);
    }
    if (filtros.mesoregiao) {
      query = query.eq('mesoregiao', filtros.mesoregiao);
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
    };

    return mappedItem;
  });
}

export async function buscarVeiculosAtivos(filialId: string): Promise<Veiculo[]> {
  const { data, error } = await supabase
    .from('veiculos')
    .select('*')
    .eq('filial_id', filialId)
    .eq('ativo', true);

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

export async function montarPayloadMotor(
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
  const [carteira, veiculos, regionalidades] = await Promise.all([
    buscarCarteiraValida(uploadId, filtros),
    buscarVeiculosAtivos(filialId),
    buscarRegionalidades(),
  ]);

  return {
    carteira,
    veiculos,
    regionalidades,
    parametros: {
      usuario_id: usuarioId,
      usuario_nome: usuarioNome,
      filial_id: filialId,
      filial_nome: filialNome,
      upload_id: uploadId,
      data_execucao: new Date().toISOString(),
      modelo_roteirizacao: modeloRoteirizacao,
      filtros_aplicados: filtros,
      origem_sistema: 'Sistema 1',
      tipo_roteirizacao: tipoRoteirizacao,
      configuracao_frota: configuracaoFrota,
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
