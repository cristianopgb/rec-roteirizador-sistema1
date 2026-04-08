/**
 * RAW column names EXACTLY as exported by REC ERP - VERSION 2.
 * This is the sequence of non-empty columns after removing __EMPTY columns.
 *
 * CRITICAL CHANGES IN V2:
 * - Renamed columns: "Filial" → "Filial R", "Filial (origem)" → "Filial D", etc.
 * - Added new columns: "Restrição Veículo", "Carro Dedicado", "Inicio Ent.", "Fim En", "Tipo Ca"
 * - Removed columns: "Região", "Veiculo Exclusivo", "Tipo C"
 * - Consolidated: "Data Des" and "Data NF" → single "Data" column (same meaning for pipeline)
 * - Removed: "Endereço" and "Número" columns
 * - Total: 43 columns in EXACT order
 */
export const COLUNAS_BRUTAS_REC = [
  'Filial R',           // 1 - Filial de roteirização (renomeada de "Filial")
  'Romane',             // 2
  'Filial D',           // 3 - Filial de origem (renomeada de "Filial (origem)")
  'Série',              // 4
  'Nro Doc.',           // 5
  'Data',               // 6 - Consolidated (replaces "Data Des" and "Data NF")
  'D.L.E.',             // 7
  'Agendam.',           // 8
  'Palet',              // 9
  'Conf',               // 10
  'Peso',               // 11
  'Vlr.Merc.',          // 12
  'Qtd.',               // 13
  'Peso Cub.',          // 14 - Renomeada de "Peso C"
  'Classif',            // 15 - Renomeada de "Classifi"
  'Tomad',              // 16 - Renomeada de "Tomador"
  'Destin',             // 17 - Renomeada de "Destinatário"
  'Bairro',             // 18
  'Cidad',              // 19 - Renomeada de "Cida"
  'UF',                 // 20
  'NF / Serie',         // 21
  'Tipo Carga',         // 22
  'Tipo Ca',            // 23 - NEW COLUMN
  'Qtd.NF',             // 24
  'Sub-Região',         // 25
  'Ocorrências NF',     // 26 - Renomeada de "Ocorrências NFs"
  'Remetente',          // 27
  'Observação',         // 28 - Renomeada de "Observação R"
  'Ref Cliente',        // 29
  'Cidade Dest.',       // 30
  'Mesoregião',         // 31
  'Agenda',             // 32
  'Última Ocorrência',  // 33 - Renomeada de "Última"
  'Status R',           // 34 - Renomeada de "Status"
  'Latitude',           // 35 - Renomeada de "Lat."
  'Longitude',          // 36 - Renomeada de "Lon."
  'Peso Calculo',       // 37 - Renomeada de "Peso Calculado"
  'Prioridade',         // 38
  'Restrição Veículo',  // 39 - NEW COLUMN
  'Carro Dedicado',     // 40 - NEW COLUMN
  'Inicio Ent.',        // 41 - NEW COLUMN (horário)
  'Fim En',             // 42 - NEW COLUMN (horário)
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
  'Romane',
  'Filial D',
  'Série',
  'Nro Doc.',
  'Data',
  'D.L.E.',
  'Agendam.',
  'Palet',
  'Conf',
  'Peso',
  'Vlr.Merc.',
  'Qtd.',
  'Peso Cub.',
  'Classif',
  'Tomad',
  'Destin',
  'Bairro',
  'Cidad',
  'UF',
  'NF / Serie',
  'Tipo Carga',
  'Tipo Ca',
  'Qtd.NF',
  'Sub-Região',
  'Ocorrências NF',
  'Remetente',
  'Observação',
  'Ref Cliente',
  'Cidade Dest.',
  'Mesoregião',
  'Agenda',
  'Última Ocorrência',
  'Status R',
  'Latitude',
  'Longitude',
  'Peso Calculo',
  'Prioridade',
  'Restrição Veículo',
  'Carro Dedicado',
  'Inicio Ent.',
  'Fim En',
] as const;

/**
 * Mapping from exact Excel column names (V2) to database-safe column names.
 * Used for extracting data from JSONB to typed columns.
 *
 * NOTE: "Data" column maps to BOTH data_des and data_nf (same value for pipeline)
 */
export const EXCEL_TO_DB_MAP: Record<string, string> = {
  'Filial R': 'filial_r',
  'Filial D': 'filial_d',
  'Romane': 'romane',
  'Série': 'serie',
  'Nro Doc.': 'nro_doc',
  'Data': 'data', // Will be split into data_des and data_nf during transformation
  'D.L.E.': 'dle',
  'Agendam.': 'agendam',
  'Palet': 'palet',
  'Conf': 'conf',
  'Peso': 'peso',
  'Vlr.Merc.': 'vlr_merc',
  'Qtd.': 'qtd',
  'Peso Cub.': 'peso_cubico',
  'Classif': 'classif',
  'Tomad': 'tomador',
  'Destin': 'destinatario',
  'Bairro': 'bairro',
  'Cidad': 'cidade',
  'UF': 'uf',
  'NF / Serie': 'nf_serie',
  'Tipo Carga': 'tipo_carga',
  'Tipo Ca': 'tipo_ca',
  'Qtd.NF': 'qtd_nf',
  'Sub-Região': 'sub_regiao',
  'Ocorrências NF': 'ocorrencias_nf',
  'Remetente': 'remetente',
  'Observação': 'observacao',
  'Ref Cliente': 'ref_cliente',
  'Cidade Dest.': 'cidade_dest',
  'Mesoregião': 'mesoregiao',
  'Agenda': 'agenda',
  'Última Ocorrência': 'ultima_ocorrencia',
  'Status R': 'status_r',
  'Latitude': 'latitude',
  'Longitude': 'longitude',
  'Peso Calculo': 'peso_calculo',
  'Prioridade': 'prioridade',
  'Restrição Veículo': 'restricao_veiculo',
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
  'Romane': string;
  'Filial D': string;
  'Série': string;
  'Nro Doc.': string;
  'Data': string;
  'D.L.E.': string;
  'Agendam.': string;
  'Palet': string;
  'Conf': string;
  'Peso': string | number;
  'Vlr.Merc.': string | number;
  'Qtd.': string | number;
  'Peso Cub.': string | number;
  'Classif': string;
  'Tomad': string;
  'Destin': string;
  'Bairro': string;
  'Cidad': string;
  'UF': string;
  'NF / Serie': string;
  'Tipo Carga': string;
  'Tipo Ca': string;
  'Qtd.NF': string | number;
  'Sub-Região': string;
  'Ocorrências NF': string;
  'Remetente': string;
  'Observação': string;
  'Ref Cliente': string;
  'Cidade Dest.': string;
  'Mesoregião': string;
  'Agenda': string;
  'Última Ocorrência': string;
  'Status R': string;
  'Latitude': string | number;
  'Longitude': string | number;
  'Peso Calculo': string | number;
  'Prioridade': string | number;
  'Restrição Veículo': string;
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
