/**
 * RAW column names EXACTLY as exported by REC ERP - VERSION 2.
 * This is the sequence of non-empty columns after removing __EMPTY columns.
 *
 * CRITICAL CHANGES IN V2:
 * - Renamed columns: "Filial" → "Filial R", "Filial (origem)" → "Filial D", etc.
 * - Added new columns: "Restrição Veículo", "Carro Dedicado", "Inicio Ent.", "Fim En", "Tipo Ca"
 * - Removed columns: "Região", "Veiculo Exclusivo", "Tipo C"
 * - Has TWO "Data" columns (Data Des and Data NF both named "Data" in export)
 * - Added: "Endereço" and "Número" columns
 * - Total: 50 columns in EXACT order AS RECEIVED FROM CLIENT
 */
export const COLUNAS_BRUTAS_REC = [
  'Filial R',           // 1
  'Romane',             // 2
  'Filial D',           // 3
  'Série',              // 4
  'Nro Doc.',           // 5
  'Data',               // 6 - Data Des (first occurrence)
  'Data',               // 7 - Data NF (second occurrence - DUPLICATE NAME!)
  'D.L.E.',             // 8
  'Agendam.',           // 9
  'Palet',              // 10
  'Conf',               // 11
  'Peso',               // 12
  'Vlr.Merc.',          // 13
  'Qtd.',               // 14
  'Peso Cub.',          // 15
  'Classif',            // 16
  'Tomad',              // 17
  'Destin',             // 18
  'Endereco',           // 19
  'Numero',             // 20
  'Bairro',             // 21
  'Cidad',              // 22
  'UF',                 // 23
  'NF / Serie',         // 24
  'Tipo Ca',            // 25
  'Qtd.NF',             // 26
  'Mesoregião',         // 27
  'Sub-Região',         // 28
  'Ocorrências NF',     // 29
  'Remetente',          // 30
  'Observação',         // 31
  'Ref Cliente',        // 32
  'Cidade Dest.',       // 33
  'Agenda',             // 34
  'Tipo Carga',         // 35
  'Última Ocorrência',  // 36
  'Status R',           // 37
  'Latitude',           // 38
  'Longitude',          // 39
  'Peso Calculo',       // 40
  'Prioridade',         // 41
  'Restrição Veículo',  // 42
  'Carro Dedicado',     // 43
  'Inicio Ent.',        // 44
  'Fim En',             // 45
  'Placa Preferencial', // 46
  'Motorista Preferencial', // 47
  'Observação Interna', // 48
  'Cliente Novo',       // 49
  'Temperatura Controlada', // 50
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
 * - Includes DUPLICATE "Data" column names (positions 6 and 7)
 *
 * Total: 50 required columns
 */
export const COLUNAS_OBRIGATORIAS_EXCEL = [
  'Filial R',
  'Romane',
  'Filial D',
  'Série',
  'Nro Doc.',
  'Data',
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
  'Endereco',
  'Numero',
  'Bairro',
  'Cidad',
  'UF',
  'NF / Serie',
  'Tipo Ca',
  'Qtd.NF',
  'Mesoregião',
  'Sub-Região',
  'Ocorrências NF',
  'Remetente',
  'Observação',
  'Ref Cliente',
  'Cidade Dest.',
  'Agenda',
  'Tipo Carga',
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
  'Placa Preferencial',
  'Motorista Preferencial',
  'Observação Interna',
  'Cliente Novo',
  'Temperatura Controlada',
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
  'Endereco': 'endereco',
  'Numero': 'numero',
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
  'Placa Preferencial': 'placa_preferencial',
  'Motorista Preferencial': 'motorista_preferencial',
  'Observação Interna': 'observacao_interna',
  'Cliente Novo': 'cliente_novo',
  'Temperatura Controlada': 'temperatura_controlada',
};

/**
 * Type representing a single row from the carteira Excel file - VERSION 2.
 * All fields from the 50-column structure.
 *
 * NOTE: Excel has two "Data" columns with the same name. We rename them internally:
 * - First "Data" becomes "Data_Des_Internal"
 * - Second "Data" becomes "Data_NF_Internal"
 */
export type CarteiraExcelRow = Partial<Record<string, any>> & {
  'Filial R': string;
  'Romane': string;
  'Filial D': string;
  'Série': string;
  'Nro Doc.': string;
  'Data_Des_Internal': string; // Internal name for first "Data" column
  'Data_NF_Internal': string;  // Internal name for second "Data" column
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
  'Tipo Ca': string;
  'Qtd.NF': string | number;
  'Mesoregião': string;
  'Sub-Região': string;
  'Ocorrências NF': string;
  'Remetente': string;
  'Observação': string;
  'Ref Cliente': string;
  'Cidade Dest.': string;
  'Agenda': string;
  'Tipo Carga': string;
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
