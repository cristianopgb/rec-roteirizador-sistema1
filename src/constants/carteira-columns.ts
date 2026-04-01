/**
 * RAW column names EXACTLY as exported by REC ERP.
 * This is the sequence of non-empty columns after removing __EMPTY columns.
 *
 * CRITICAL: This is the official raw layout from REC:
 * - The 1st and 3rd columns are BOTH named "Filial" (not a typo!)
 * - First "Filial" = filial de roteirização (onde será feita a roteirização)
 * - Third "Filial" = filial de origem (de onde a carga chegou)
 * - NO renaming occurs - columns stay exactly as exported from ERP
 * - Validation uses the SEQUENCE of non-empty columns (not sheet indices)
 * - Total: 38 columns in EXACT order
 */
export const COLUNAS_BRUTAS_REC = [
  'Filial',          // 1 - Filial de roteirização
  'Romane',          // 2
  'Filial',          // 3 - Filial de origem (mesmo nome, dados diferentes)
  'Série',           // 4
  'Nro Doc.',        // 5
  'Data Des',        // 6
  'Data NF',         // 7
  'D.L.E.',          // 8
  'Agendam.',        // 9
  'Palet',           // 10
  'Conf',            // 11
  'Peso',            // 12
  'Vlr.Merc.',       // 13
  'Qtd.',            // 14
  'Peso C',          // 15
  'Classifi',        // 16
  'Tomador',         // 17
  'Destinatário',    // 18
  'Bairro',          // 19
  'Cida',            // 20
  'UF',              // 21
  'NF / Serie',      // 22
  'Tipo Carga',      // 23
  'Qtd.NF',          // 24
  'Região',          // 25
  'Sub-Região',      // 26
  'Ocorrências NFs', // 27
  'Remetente',       // 28
  'Observação R',    // 29
  'Ref Cliente',     // 30
  'Cidade Dest.',    // 31
  'Mesoregião',      // 32
  'Agenda',          // 33
  'Tipo C',          // 34
  'Última',          // 35
  'Status',          // 36
  'Lat.',            // 37
  'Lon.',            // 38
] as const;

/**
 * Expected column names for carteira validation.
 * IDENTICAL to COLUNAS_BRUTAS_REC - no transformation occurs.
 *
 * CRITICAL: These column names must match EXACTLY:
 * - Case sensitive
 * - Space sensitive
 * - Accent sensitive
 * - No normalization allowed
 * - NO renaming - third column stays as "Filial"
 *
 * Total: 38 required columns
 */
export const COLUNAS_OBRIGATORIAS_EXCEL = [
  'Filial',
  'Romane',
  'Filial',
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
 * Since 'Filial' appears twice in the raw data, we use Partial<Record> to handle dynamic keys.
 * Access via array notation: row['Filial'] returns first occurrence.
 */
export type CarteiraExcelRow = Partial<Record<string, any>> & {
  'Romane': string;
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
