export type Role = 'admin' | 'user';

export interface Filial {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  latitude?: number;
  longitude?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  nome: string;
  email: string;
  role: Role;
  filial_id: string;
  filial?: Filial;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type TipoFrota = 'proprio' | 'terceiro' | 'agregado';

export interface Veiculo {
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
  filial?: Filial;
  tipo_frota?: TipoFrota | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVeiculo {
  perfil: string;
  qtd_eixos: number;
  capacidade_peso_kg: number;
  capacidade_vol_m3: number;
  max_entregas: number;
  max_km_distancia: number;
  ocupacao_minima_perc: number;
}

export interface UpdateVeiculo {
  perfil?: string;
  qtd_eixos?: number;
  capacidade_peso_kg?: number;
  capacidade_vol_m3?: number;
  max_entregas?: number;
  max_km_distancia?: number;
  ocupacao_minima_perc?: number;
  ativo?: boolean;
}

export interface Regionalidade {
  id: string;
  cidade: string;
  uf: string;
  mesorregiao: string;
  microrregiao: string;
  created_at: string;
}

export interface CreateRegionalidade {
  cidade: string;
  uf: string;
  mesorregiao: string;
  microrregiao: string;
}

export interface ImportacaoRegionalidade {
  id: string;
  arquivo_nome: string;
  total_linhas: number;
  inseridos: number;
  duplicados: number;
  erros: number;
  user_id: string | null;
  created_at: string;
}

export interface RegionalidadeUploadResult {
  total_linhas: number;
  inseridos: number;
  duplicados: number;
  erros: number;
  erros_detalhes?: string[];
}

export interface UFSummary {
  uf: string;
  total_cidades: number;
}

export interface CreateUserData {
  nome: string;
  email: string;
  password: string;
  role: Role;
  filial_id: string;
}

export type TipoRoteirizacao = 'carteira' | 'frota';

export interface ConfiguracaoFrota {
  perfil: string;
  quantidade: number;
}

export interface PayloadMotorParametros {
  usuario_nome?: string;
  filial_nome?: string;
  origem_sistema?: 'sistema_1';
  modelo_roteirizacao?: string;
  filtros_aplicados?: Record<string, any>;
  callback_url?: string;
}

export interface CarteiraItemPayload {
  filial_r?: number;
  romane?: number;
  filial_d?: number;
  nro_doc?: number;
  destinatario?: string;
  cidade?: string;
  uf?: string;
  bairro?: string;
  latitude?: number;
  longitude?: number;
  peso?: number;
  peso_cubico?: number;
  vlr_merc?: number;
  qtd?: number;
  data_des?: string;
  dle?: string;
  agendam?: string;
  mesoregiao?: string;
  tipo_carga?: string;
  tipo_ca?: string;
  prioridade?: string;
  restricao_veiculo?: string;
  carro_dedicado?: boolean;
  janela_entrega?: {
    inicio: string | null;
    fim: string | null;
  };
}

export interface CarteiraItem {
  id: string;
  upload_id: string;
  linha_numero: number;
  status_validacao: 'valida' | 'invalida';
  erro_validacao?: string | null;

  filial_r?: number | null;
  romane?: number | null;
  filial_d?: number | null;
  serie?: number | null;
  nro_doc?: number | null;
  data_des?: string | null;
  data_nf?: string | null;
  dle?: string | null;
  agendam?: string | null;
  palet?: number | null;
  conf?: string | null;
  peso?: number | null;
  vlr_merc?: number | null;
  qtd?: number | null;
  peso_cubico?: number | null;
  classif?: string | null;
  tomad?: string | null;
  destin?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  nf_serie?: string | null;
  tipo_carga?: string | null;
  tipo_ca?: string | null;
  qtd_nf?: number | null;
  sub_regiao?: string | null;
  ocorrencias_nf?: string | null;
  remetente?: string | null;
  observacao?: string | null;
  ref_cliente?: string | null;
  cidade_dest?: string | null;
  mesoregiao?: string | null;
  agenda?: string | null;
  ultima_ocorrencia?: string | null;
  status_r?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  peso_calculo?: number | null;
  prioridade?: string | null;
  restricao_veiculo?: string | null;
  carro_dedicado?: boolean | null;
  inicio_entrega?: string | null;
  fim_entrega?: string | null;
  dados_originais?: Record<string, any>;
  created_at?: string;
}

export interface CarteiraFilterValues {
  status_validacao?: 'valida' | 'invalida';
  filial_r?: string | string[];
  uf?: string | string[];
  destin?: string | string[];
  cidade?: string | string[];
  tomad?: string | string[];
  mesoregiao?: string | string[];
  data_des_inicio?: string;
  data_des_fim?: string;
  dle_inicio?: string;
  dle_fim?: string;
  agendam_inicio?: string;
  agendam_fim?: string;
  data_nf_inicio?: string;
  data_nf_fim?: string;
  prioridade?: string | string[];
  restricao_veiculo?: string | string[];
  carro_dedicado?: boolean;
  tipo_roteirizacao?: TipoRoteirizacao;
  configuracao_frota?: ConfiguracaoFrota[];
}

export interface Upload {
  id: string;
  arquivo_nome: string;
  total_linhas: number;
  total_validas: number;
  total_invalidas: number;
  filial_id: string;
  user_id: string;
  created_at: string;
}

export interface RespostaMotorM8TemposMs {
  tempo_total_pipeline_ms?: number | null;
  tempo_leitura_ms?: number | null;
  tempo_geocodificacao_ms?: number | null;
  tempo_otimizacao_ms?: number | null;
  tempo_montagem_ms?: number | null;
  [key: string]: number | null | undefined;
}

export interface ResumoExecucaoM8 {
  rodada_id: string;
  upload_id: string;
  filial_id: string;
  usuario_id: string;
  data_execucao?: string | null;
  origem_sistema?: string | null;
  tipo_roteirizacao?: TipoRoteirizacao | string | null;
  modelo_roteirizacao?: string | null;
  versao_motor?: string | null;
  tempos_ms?: RespostaMotorM8TemposMs | null;
}

export interface ContextoRodadaM8 {
  rodada_id?: string;
  upload_id?: string;
  filial_id?: string;
  usuario_id?: string;
  data_base_roteirizacao?: string | null;
  tipo_roteirizacao?: TipoRoteirizacao | string | null;
  filtros_aplicados?: Record<string, any> | null;
  configuracao_frota?: ConfiguracaoFrota[] | null;
  filial?: Record<string, any>;
  parametros_rodada?: Record<string, any>;
}

export interface StatusModuloM8 {
  modulo: string;
  status: string;
  mensagem?: string | null;
  tempo_ms?: number | null;
  quantidade_entrada?: number | null;
  quantidade_saida?: number | null;
}

export interface EstatisticasCarteiraM8 {
  total_carteira: number;
  total_roteirizavel: number;
  total_agendamento_futuro: number;
  total_agendas_vencidas: number;
  total_excecoes: number;
  total_sem_agenda: number;
}

export interface EstatisticasCargasM8 {
  total_manifestos_m7: number;
  total_itens_m7: number;
  cargas_fechadas_m4: number;
  cargas_compostas_m5: number;
  remanescente_m6_2: number;
  km_total_m7: number;
  km_medio_manifesto_m7: number;
  ocupacao_media_manifesto_m7: number;
  qtd_media_itens_por_manifesto: number;
}

export interface EstatisticaPorPerfilQuantidadeM8 {
  chave: string;
  quantidade: number;
}

export interface EstatisticaPorPerfilOcupacaoM8 {
  chave: string;
  ocupacao_total: number;
}

export interface EstatisticaPorPerfilKmM8 {
  chave: string;
  km_total: number;
}

export interface EstatisticaPorCidadeM8 {
  cidade: string;
  quantidade_entregas: number;
  peso_total: number;
}

export interface EstatisticaPorLeadtimeM8 {
  faixa: string;
  quantidade: number;
}

export interface EstatisticasRoteirizacaoM8 {
  carteira: EstatisticasCarteiraM8;
  cargas: EstatisticasCargasM8;
  por_veiculo: {
    cargas_por_perfil: EstatisticaPorPerfilQuantidadeM8[];
    ocupacao_por_perfil: EstatisticaPorPerfilOcupacaoM8[];
    km_por_perfil: EstatisticaPorPerfilKmM8[];
  };
  por_cidade: EstatisticaPorCidadeM8[];
  por_leadtime_agenda: EstatisticaPorLeadtimeM8[];
}

export interface ResultadosM8 {
  manifestos: any[];
  itens_manifestos: any[];
  tentativas_m7: any[];
}

export interface AuditoriaLogM8 {
  modulo?: string;
  status?: string;
  mensagem?: string;
  tempo_ms?: number | null;
  quantidade_entrada?: number | null;
  quantidade_saida?: number | null;
  [key: string]: any;
}

export interface AuditoriaM8 {
  auditoria_m7?: Record<string, any>;
  logs: AuditoriaLogM8[];
}

export interface CallbackResultadoM8 {
  callback_enviado: boolean;
  callback_status: string;
  callback_http_status?: number | null;
  callback_url?: string;
  callback_mensagem?: string;
}

export interface RespostaMotorM8 {
  status: 'ok' | 'erro' | 'parcial';
  mensagem: string;
  pipeline_real_ate: string;
  modo_resposta: 'contrato_retorno_sistema_1_m8' | string;
  resumo_execucao: ResumoExecucaoM8;
  contexto_rodada?: ContextoRodadaM8;
  status_modulos: StatusModuloM8[];
  estatisticas_roteirizacao: EstatisticasRoteirizacaoM8;
  resultados: ResultadosM8;
  auditoria: AuditoriaM8;
  motor_response_raw: Record<string, any>;
  callback_resultado?: CallbackResultadoM8;
}

export function isRespostaMotorM8(data: any): data is RespostaMotorM8 {
  return !!data
    && typeof data === 'object'
    && data.modo_resposta === 'contrato_retorno_sistema_1_m8'
    && typeof data.status === 'string'
    && !!data.resumo_execucao
    && typeof data.resumo_execucao === 'object'
    && typeof data.resumo_execucao.rodada_id === 'string'
    && !!data.estatisticas_roteirizacao
    && !!data.resultados;
}