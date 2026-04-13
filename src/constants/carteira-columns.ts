/**
 * RAW column names EXACTLY as exported by REC ERP - VERSION 2.
 * This is the sequence of non-empty columns after removing __EMPTY columns.
 *
 * CRITICAL: Layout baseado no arquivo real fornecido pelo cliente.
 * - Total: 43 columns in EXACT order AS RECEIVED FROM CLIENT
 */
export const COLUNAS_BRUTAS_REC = [
  'Filial R',           // 1
  'Romanei',            // 2
  'Filial ',            // 3
  'Série D',            // 4
  'Nro Do',             // 5
  'Data D',             // 6
  'Data N',             // 7
  'D.L.E.',             // 8
  'Agendam.',           // 9
  'Palet',              // 10
  'Conf',               // 11
  'Peso',               // 12
  'Vlr.Merc.',          // 13
  'Qtd.',               // 14
  'Peso Cub',           // 15
  'Classifica',         // 16
  'Tomad',              // 17
  'Destina',            // 18
  'Bairro',             // 19
  'Cida',               // 20
  'UF',                 // 21
  'NF/Ser',             // 22
  'Tipo Carg',          // 23
  'Qtd.NF',             // 24
  'Mesoregião',         // 25
  'Sub-Região',         // 26
  'Ocorrências N',      // 27
  'Remetente',          // 28
  'Observação R',       // 29
  'Ref Cliente',        // 30
  'Cidade Dest.',       // 31
  'Agenda',             // 32
  'Tipo Carga',         // 33
  'Última Ocorrê',      // 34
  'Status Rom. O',      // 35
  'Latitude',           // 36
  'Longitude',          // 37
  'Peso Calculo',       // 38
  'Prioridade',         // 39
  'Restrição Veíc',     // 40
  'Carro Dedicado',     // 41
  'Inicio Ent.',        // 42
  'Fim En',             // 43
] as const;

/**
 * Expected column names for carteira validation - VERSION 2.
 * IDENTICAL to COLUNAS_BRUTAS_REC.
 *
 * CRITICAL: These column names must match EXACTLY:
 * - Case sensitive
 * - Space sensitive
 * - Accent sensitive
 * - No normalization allowed
 *
 * Total: 43 required columns
 */
export const COLUNAS_OBRIGATORIAS_EXCEL = [
  'Filial R',
  'Romanei',
  'Filial ',
  'Série D',
  'Nro Do',
  'Data D',
  'Data N',
  'D.L.E.',
  'Agendam.',
  'Palet',
  'Conf',
  'Peso',
  'Vlr.Merc.',
  'Qtd.',
  'Peso Cub',
  'Classifica',
  'Tomad',
  'Destina',
  'Bairro',
  'Cida',
  'UF',
  'NF/Ser',
  'Tipo Carg',
  'Qtd.NF',
  'Mesoregião',
  'Sub-Região',
  'Ocorrências N',
  'Remetente',
  'Observação R',
  'Ref Cliente',
  'Cidade Dest.',
  'Agenda',
  'Tipo Carga',
  'Última Ocorrê',
  'Status Rom. O',
  'Latitude',
  'Longitude',
  'Peso Calculo',
  'Prioridade',
  'Restrição Veíc',
  'Carro Dedicado',
  'Inicio Ent.',
  'Fim En',
] as const;

/**
 * Mapping from exact Excel column names (V2) to database-safe column names.
 */
export const EXCEL_TO_DB_MAP: Record<string, string> = {
  'Filial R': 'filial_r',
  'Romanei': 'romane',
  'Filial ': 'filial_d',
  'Série D': 'serie',
  'Nro Do': 'nro_doc',
  'Data D': 'data_des',
  'Data N': 'data_nf',
  'D.L.E.': 'dle',
  'Agendam.': 'agendam',
  'Palet': 'palet',
  'Conf': 'conf',
  'Peso': 'peso',
  'Vlr.Merc.': 'vlr_merc',
  'Qtd.': 'qtd',
  'Peso Cub': 'peso_cubico',
  'Classifica': 'classif',
  'Tomad': 'tomad',
  'Destina': 'destin',
  'Bairro': 'bairro',
  'Cida': 'cidade',
  'UF': 'uf',
  'NF/Ser': 'nf_serie',
  'Tipo Carg': 'tipo_ca',
  'Qtd.NF': 'qtd_nf',
  'Mesoregião': 'mesoregiao',
  'Sub-Região': 'sub_regiao',
  'Ocorrências N': 'ocorrencias_nf',
  'Remetente': 'remetente',
  'Observação R': 'observacao',
  'Ref Cliente': 'ref_cliente',
  'Cidade Dest.': 'cidade_dest',
  'Agenda': 'agenda',
  'Tipo Carga': 'tipo_carga',
  'Última Ocorrê': 'ultima_ocorrencia',
  'Status Rom. O': 'status_r',
  'Latitude': 'latitude',
  'Longitude': 'longitude',
  'Peso Calculo': 'peso_calculo',
  'Prioridade': 'prioridade',
  'Restrição Veíc': 'restricao_veiculo',
  'Carro Dedicado': 'carro_dedicado',
  'Inicio Ent.': 'inicio_entrega',
  'Fim En': 'fim_entrega',
};

/**
 * Type representing a single row from the carteira Excel file - VERSION 2.
 * All fields from the 43-column structure.
 */
export type CarteiraExcelRow = Partial<Record<string, any>> & {
  'Filial R': string;
  'Romanei': string;
  'Filial ': string;
  'Série D': string;
  'Nro Do': string;
  'Data D': string;
  'Data N': string;
  'D.L.E.': string;
  'Agendam.': string;
  'Palet': string;
  'Conf': string;
  'Peso': string | number;
  'Vlr.Merc.': string | number;
  'Qtd.': string | number;
  'Peso Cub': string | number;
  'Classifica': string;
  'Tomad': string;
  'Destina': string;
  'Bairro': string;
  'Cida': string;
  'UF': string;
  'NF/Ser': string;
  'Tipo Carg': string;
  'Qtd.NF': string | number;
  'Mesoregião': string;
  'Sub-Região': string;
  'Ocorrências N': string;
  'Remetente': string;
  'Observação R': string;
  'Ref Cliente': string;
  'Cidade Dest.': string;
  'Agenda': string;
  'Tipo Carga': string;
  'Última Ocorrê': string;
  'Status Rom. O': string;
  'Latitude': string | number;
  'Longitude': string | number;
  'Peso Calculo': string | number;
  'Prioridade': string | number;
  'Restrição Veíc': string;
  'Carro Dedicado': string | boolean;
  'Inicio Ent.': string;
  'Fim En': string;
};

/**
 * Validation result for a single row
 */
export interface RowValidationResult {
  status: 'valida' | 'invalida';
  erro?: string;
}

/**
 * Structure validation result
 */
export interface StructureValidationResult {
  valid: boolean;
  missingColumns?: string[];
  extraColumns?: string[];
  mismatchedColumns?: Array<{ expected: string; found: string }>;
  errorMessage?: string;
}
