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
  usuario_id: string;
  usuario_nome: string;
  filial_id: string;
  filial_nome: string;
  upload_id: string;
  rodada_id: string;
  data_execucao: string;
  data_base_roteirizacao: string;
  origem_sistema: 'sistema_1';
  modelo_roteirizacao: string;
  tipo_roteirizacao: TipoRoteirizacao;
  configuracao_frota: ConfiguracaoFrota[];
  filtros_aplicados: Record<string, any>;
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
  endereco?: string;
  numero?: string;
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
  endereco?: string | null;
  numero?: string | null;
  placa_preferencial?: string | null;
  motorista_preferencial?: string | null;
  observacao_interna?: string | null;
  cliente_novo?: string | null;
  temperatura_controlada?: string | null;

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
