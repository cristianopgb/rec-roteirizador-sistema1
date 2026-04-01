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
  };
}

export interface RespostaMotor {
  sucesso: boolean;
  mensagem: string;
  total_rotas?: number;
  dados?: any;
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
    .select('dados_linha')
    .eq('upload_id', uploadId)
    .eq('status_validacao', 'valida');

  // Apply filters if provided
  if (filtros) {
    if (filtros.uf) {
      query = query.contains('dados_linha', { UF: filtros.uf });
    }
    if (filtros.cidade) {
      query = query.contains('dados_linha', { Cida: filtros.cidade });
    }
    if (filtros.filial) {
      query = query.contains('dados_linha', { Filial: filtros.filial });
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar carteira: ${error.message}`);
  }

  return (data || []).map(item => {
    const mappedItem: Record<string, any> = {};

    // Map all 38 required columns, preserving absence of data
    COLUNAS_OBRIGATORIAS_EXCEL.forEach(coluna => {
      const valor = item.dados_linha[coluna];

      // Preserve null for missing numeric values
      if (valor === undefined || valor === null) {
        // For numeric columns, keep as null
        if (['Peso', 'Vlr.Merc.', 'Qtd.', 'Peso C', 'Qtd.NF', 'Lat.', 'Lon.'].includes(coluna)) {
          mappedItem[coluna] = null;
        } else {
          // For string columns, use empty string or null based on semantics
          mappedItem[coluna] = coluna === 'Observação R' || coluna === 'Ref Cliente' ? null : '';
        }
      } else {
        // Preserve original value without conversion
        mappedItem[coluna] = valor;
      }
    });

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
  filtros: Record<string, any> = {}
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
  // This function can be implemented when audit table is created
  console.log('Auditoria:', acao, metadados);
}
