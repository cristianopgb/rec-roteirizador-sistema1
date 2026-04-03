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
  dedicado?: boolean | null;
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
