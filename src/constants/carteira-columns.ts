/**
 * EXACT Excel column names for carteira upload validation.
 *
 * CRITICAL: These column names must match EXACTLY as they appear in Excel:
 * - Case sensitive
 * - Space sensitive
 * - Accent sensitive
 * - No normalization allowed
 *
 * Total: 38 required columns
 */
export const COLUNAS_OBRIGATORIAS_EXCEL = [
  'Filial',
  'Romane',
  'Filial (origem)',
  'Série',
  'Nro Doc.',
  'Data Des',
  'Data NF',
  'D.L.E.',
  'Agendam.',
  'Palet',
  'Conf',
  'Peso',
  'Vlr.Merc.',
  'Qtd.',
  'Peso C',
  'Classifi',
  'Tomador',
  'Destinatário',
  'Bairro',
  'Cida',
  'UF',
  'NF / Serie',
  'Tipo Carga',
  'Qtd.NF',
  'Região',
  'Sub-Região',
  'Ocorrências NFs',
  'Remetente',
  'Observação R',
  'Ref Cliente',
  'Cidade Dest.',
  'Mesoregião',
  'Agenda',
  'Tipo C',
  'Última',
  'Status',
  'Lat.',
  'Lon.',
] as const;

/**
 * Mapping from exact Excel column names to database-safe column names.
 * Used for extracting data from JSONB to typed columns.
 */
export const EXCEL_TO_DB_MAP: Record<string, string> = {
  'Filial': 'filial',
  'Romane': 'romane',
  'Nro Doc.': 'nro_doc',
  'UF': 'uf',
  'Cida': 'cida',
  'Destinatário': 'destinatario',
  'Tomador': 'tomador',
  'Peso': 'peso',
  'Vlr.Merc.': 'vlr_merc',
  'Data Des': 'data_des',
  'D.L.E.': 'dle',
  'Agendam.': 'agendam',
  'Lat.': 'lat',
  'Lon.': 'lon',
};

/**
 * Type representing a single row from the carteira Excel file.
 * Uses exact column names as they appear in Excel.
 */
export type CarteiraExcelRow = {
  'Filial': string;
  'Romane': string;
  'Filial (origem)': string;
  'Série': string;
  'Nro Doc.': string;
  'Data Des': string;
  'Data NF': string;
  'D.L.E.': string;
  'Agendam.': string;
  'Palet': string;
  'Conf': string;
  'Peso': string | number;
  'Vlr.Merc.': string | number;
  'Qtd.': string | number;
  'Peso C': string | number;
  'Classifi': string;
  'Tomador': string;
  'Destinatário': string;
  'Bairro': string;
  'Cida': string;
  'UF': string;
  'NF / Serie': string;
  'Tipo Carga': string;
  'Qtd.NF': string | number;
  'Região': string;
  'Sub-Região': string;
  'Ocorrências NFs': string;
  'Remetente': string;
  'Observação R': string;
  'Ref Cliente': string;
  'Cidade Dest.': string;
  'Mesoregião': string;
  'Agenda': string;
  'Tipo C': string;
  'Última': string;
  'Status': string;
  'Lat.': string | number;
  'Lon.': string | number;
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
