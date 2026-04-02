import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import {
  COLUNAS_BRUTAS_REC,
  COLUNAS_OBRIGATORIAS_EXCEL,
  EXCEL_TO_DB_MAP,
  CarteiraExcelRow,
  RowValidationResult,
  StructureValidationResult,
} from '../constants/carteira-columns';

/**
 * Normalizes a header name by:
 * - Converting null/undefined to empty string
 * - Trimming whitespace from edges
 * - Collapsing multiple internal spaces into one
 * - Removing technical suffixes (_1, _2, etc.) added by libraries for duplicate columns
 *
 * Examples:
 * - "Filial " → "Filial"
 * - "Série " → "Série"
 * - "Filial _1" → "Filial"
 * - "Filial_1" → "Filial"
 * - "Nro Doc. " → "Nro Doc."
 */
function normalizeHeaderName(name: unknown): string {
  // null / undefined
  if (name === null || name === undefined) {
    return "";
  }

  // força string
  let normalized = String(name);

  // trim nas pontas
  normalized = normalized.trim();

  // se ficou vazio depois do trim
  if (!normalized) {
    return "";
  }

  // colapsa múltiplos espaços internos
  normalized = normalized.replace(/\s+/g, " ");

  // remove sufixos técnicos automáticos de bibliotecas para colunas duplicadas
  // Exemplos:
  // "Filial _1" -> "Filial"
  // "Filial_1"  -> "Filial"
  // "Filial _12" -> "Filial"
  // Só remove quando o padrão está NO FINAL e é claramente técnico
  normalized = normalized.replace(/\s*_\d+$/, "");

  // trim de novo caso tenha sobrado espaço após remover o sufixo
  normalized = normalized.trim();

  return normalized;
}

/**
 * Checks if a column name is invalid/should be removed.
 * Returns true for:
 * - undefined
 * - null
 * - empty string
 * - whitespace-only string
 * - "__EMPTY"
 * - "__EMPTY_1", "__EMPTY_2", etc.
 */
function isInvalidColumnName(columnName: any): boolean {
  if (columnName === undefined || columnName === null) {
    return true;
  }

  if (typeof columnName !== 'string') {
    return true;
  }

  const trimmed = columnName.trim();
  if (trimmed === '') {
    return true;
  }

  // Match __EMPTY or __EMPTY_N pattern
  if (/^__EMPTY(_\d+)?$/.test(columnName)) {
    return true;
  }

  return false;
}

/**
 * Remove invalid columns from Excel headers.
 * This is a deterministic operation on the raw REC file.
 */
function removerColunasVazias(headers: string[]): string[] {
  return headers.filter(header => !isInvalidColumnName(header));
}

/**
 * Rename the 3rd "Filial" column to "Filial (origem)" to eliminate ambiguity.
 * The raw REC export has two columns named "Filial":
 * - Position 0 (1st): Filial (stays as is)
 * - Position 2 (3rd): Filial → renamed to "Filial (origem)"
 */
function renomearFilialOrigem(headers: string[]): string[] {
  const renamed = [...headers];
  let filialCount = 0;

  for (let i = 0; i < renamed.length; i++) {
    if (renamed[i] === 'Filial') {
      filialCount++;
      // Rename the 2nd occurrence (which is position 2, the 3rd column)
      if (filialCount === 2) {
        renamed[i] = 'Filial (origem)';
      }
    }
  }

  return renamed;
}

/**
 * Validates EXACT order and names of the 38 raw columns from REC file.
 * This validation happens on the SEQUENCE of non-empty columns (not original sheet indices).
 * NO tolerance for different order or names.
 *
 * CRITICAL: After renaming, expects "Filial" at position 0 and "Filial (origem)" at position 2.
 */
function validarOrdemExataBruta(headers: string[]): StructureValidationResult {
  // Must have exactly 38 columns after removing empty ones
  if (headers.length !== 38) {
    const columnsInfo = `Colunas encontradas: [${headers.join(', ')}]`;
    return {
      valid: false,
      errorMessage: `Arquivo fora do layout oficial da carteira REC após limpeza de colunas inválidas. Esperado: 38 colunas, encontrado: ${headers.length}. ${columnsInfo}`,
    };
  }

  // Check exact order and names in the SEQUENCE
  const mismatchedColumns: Array<{ expected: string; found: string }> = [];

  for (let i = 0; i < COLUNAS_BRUTAS_REC.length; i++) {
    const expected = COLUNAS_BRUTAS_REC[i];
    const found = headers[i];

    if (expected !== found) {
      mismatchedColumns.push({ expected, found });
    }
  }

  if (mismatchedColumns.length > 0) {
    const details = mismatchedColumns
      .map((m, idx) => {
        const position = mismatchedColumns.indexOf(m);
        return `Posição ${position + 1}: esperado "${m.expected}", encontrado "${m.found}"`;
      })
      .slice(0, 5)
      .join('; ');

    return {
      valid: false,
      mismatchedColumns,
      errorMessage: `Arquivo fora do layout oficial da carteira REC após limpeza. Colunas fora de ordem: ${details}`,
    };
  }

  return { valid: true };
}


interface UploadResult {
  success: boolean;
  uploadId?: string;
  total_linhas: number;
  total_validas: number;
  total_invalidas: number;
  error?: string;
}

interface CarteiraItem {
  upload_id: string;
  linha_numero: number;
  status_validacao: 'valida' | 'invalida';
  erro_validacao?: string;
  // All 38 columns as real database columns
  filial?: string;
  romane?: string;
  filial_origem?: string;
  serie?: string;
  nro_doc?: string;
  data_des?: string | null;
  data_nf?: string | null;
  dle?: string | null;
  agendam?: string | null;
  palet?: string;
  conf?: string;
  peso?: number;
  vlr_merc?: number;
  qtd?: number;
  peso_c?: number;
  classifi?: string;
  tomador?: string;
  destinatario?: string;
  bairro?: string;
  cida?: string;
  uf?: string;
  nf_serie?: string;
  tipo_carga?: string;
  qtd_nf?: number;
  regiao?: string;
  sub_regiao?: string;
  ocorrencias_nfs?: string;
  remetente?: string;
  observacao_r?: string;
  ref_cliente?: string;
  cidade_dest?: string;
  mesoregiao?: string;
  agenda?: string;
  tipo_c?: string;
  ultima?: string;
  status?: string;
  lat?: number;
  lon?: number;
}


/**
 * Validates a single carteira row.
 * Operates on row object with EXACT Excel column names.
 */
export function validateCarteiraRow(
  row: Partial<CarteiraExcelRow>
): RowValidationResult {
  const errors: string[] = [];

  // Validate UF (must be exactly 2 characters)
  const uf = row['UF'];
  if (!uf || typeof uf !== 'string' || uf.length !== 2) {
    errors.push('UF deve ter exatamente 2 caracteres');
  }

  // Validate Peso (must be a valid number)
  const peso = row['Peso'];
  if (peso === undefined || peso === null || peso === '') {
    errors.push('Peso é obrigatório');
  } else {
    const pesoNum = typeof peso === 'number' ? peso : parseFloat(String(peso).replace(',', '.'));
    if (isNaN(pesoNum)) {
      errors.push('Peso deve ser um número válido');
    }
  }

  // Validate Vlr.Merc. (must be a valid number)
  const vlrMerc = row['Vlr.Merc.'];
  if (vlrMerc === undefined || vlrMerc === null || vlrMerc === '') {
    errors.push('Vlr.Merc. é obrigatório');
  } else {
    const vlrMercNum = typeof vlrMerc === 'number' ? vlrMerc : parseFloat(String(vlrMerc).replace(',', '.'));
    if (isNaN(vlrMercNum)) {
      errors.push('Vlr.Merc. deve ser um número válido');
    }
  }

  // Validate Lat. (optional, but if present must be valid number)
  const lat = row['Lat.'];
  if (lat !== undefined && lat !== null && lat !== '') {
    const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat).replace(',', '.'));
    if (isNaN(latNum)) {
      errors.push('Lat. deve ser um número válido');
    }
  }

  // Validate Lon. (optional, but if present must be valid number)
  const lon = row['Lon.'];
  if (lon !== undefined && lon !== null && lon !== '') {
    const lonNum = typeof lon === 'number' ? lon : parseFloat(String(lon).replace(',', '.'));
    if (isNaN(lonNum)) {
      errors.push('Lon. deve ser um número válido');
    }
  }

  if (errors.length > 0) {
    return {
      status: 'invalida',
      erro: errors.join('; '),
    };
  }

  return { status: 'valida' };
}

/**
 * Safely parse a value as a number, handling Excel formats.
 * Detects Brazilian (1.234,56) and US (1,234.56) number formats.
 */
function parseNumber(value: any): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'number') {
    return value;
  }

  const strValue = String(value).trim();
  if (strValue === '') {
    return undefined;
  }

  // Check if contains both separators
  const hasComma = strValue.includes(',');
  const hasDot = strValue.includes('.');

  let cleanedValue = strValue;

  if (hasComma && hasDot) {
    // Determine format by which separator comes last
    const lastCommaIndex = strValue.lastIndexOf(',');
    const lastDotIndex = strValue.lastIndexOf('.');

    if (lastCommaIndex > lastDotIndex) {
      // Brazilian format: 8.655,42
      // Remove dots (thousands separator), replace comma with dot (decimal)
      cleanedValue = strValue.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 8,655.42
      // Remove commas (thousands separator), keep dot (decimal)
      cleanedValue = strValue.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Only comma: assume decimal separator (Brazilian simple format: 123,45)
    cleanedValue = strValue.replace(',', '.');
  } else if (hasDot && !hasComma) {
    // Only dot: already in US format or simple number
    cleanedValue = strValue;
  }

  const num = parseFloat(cleanedValue);
  return isNaN(num) ? undefined : num;
}

/**
 * Robustly normalize date values from Excel to PostgreSQL ISO format (YYYY-MM-DD).
 *
 * Handles:
 * - null/undefined/empty strings → null
 * - JavaScript Date objects → YYYY-MM-DD
 * - Excel serial numbers (e.g., 45329) → YYYY-MM-DD
 * - DD/MM/YYYY or D/M/YYYY strings → YYYY-MM-DD
 * - YYYY-MM-DD strings → validated and returned
 * - Invalid dates → null
 *
 * @param value - The date value from Excel (can be string, number, Date, null, undefined)
 * @param columnName - Optional column name for detailed error logging
 * @returns ISO date string (YYYY-MM-DD) or null if invalid/empty
 */
function normalizeDateValue(value: any, columnName?: string): string | null {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === '') {
    return null;
  }

  try {
    // Case 1: JavaScript Date object
    if (value instanceof Date) {
      if (isNaN(value.getTime())) {
        console.warn(`[normalizeDateValue] Invalid Date object for column "${columnName}":`, value);
        return null;
      }
      return value.toISOString().split('T')[0];
    }

    // Case 2: Excel serial number (number between 1 and 100000)
    if (typeof value === 'number') {
      // Excel serial date: days since 1900-01-01 (with bugs for 1900 leap year)
      if (value > 0 && value < 100000) {
        // Excel incorrectly treats 1900 as a leap year, so we adjust
        const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
        const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
        if (isNaN(date.getTime())) {
          console.warn(`[normalizeDateValue] Invalid Excel serial number for column "${columnName}": ${value}`);
          return null;
        }
        return date.toISOString().split('T')[0];
      } else {
        console.warn(`[normalizeDateValue] Number out of Excel date range for column "${columnName}": ${value}`);
        return null;
      }
    }

    // Case 3: String formats
    if (typeof value === 'string') {
      let trimmed = value.trim();

      // Remove trailing comma if present (e.g., "26/02/2026 07:00:00,")
      if (trimmed.endsWith(',')) {
        trimmed = trimmed.slice(0, -1).trim();
      }

      // If contains space, extract date part before time (e.g., "09/02/2026 08:30:00")
      if (trimmed.includes(' ')) {
        const spaceParts = trimmed.split(' ');
        if (spaceParts.length >= 2) {
          // Extract the first part as the date
          trimmed = spaceParts[0].trim();
        }
      }

      // Already in YYYY-MM-DD format?
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const testDate = new Date(trimmed);
        if (!isNaN(testDate.getTime())) {
          return trimmed;
        }
      }

      // DD/MM/YYYY or D/M/YYYY format
      if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          const year = parseInt(parts[2], 10);

          // Validate ranges
          if (isNaN(day) || isNaN(month) || isNaN(year)) {
            console.warn(`[normalizeDateValue] Non-numeric date parts for column "${columnName}": ${trimmed}`);
            return null;
          }

          if (month < 1 || month > 12) {
            console.warn(`[normalizeDateValue] Invalid month for column "${columnName}": ${trimmed} (month=${month})`);
            return null;
          }

          if (day < 1 || day > 31) {
            console.warn(`[normalizeDateValue] Invalid day for column "${columnName}": ${trimmed} (day=${day})`);
            return null;
          }

          // Full year validation (handle 2-digit years)
          let fullYear = year;
          if (year < 100) {
            // Assume 2000s for years < 100
            fullYear = 2000 + year;
          }

          // Create date and validate it's actually valid (handles Feb 31, etc.)
          const isoString = `${fullYear.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const testDate = new Date(isoString);

          // Check if the date components match (catches invalid dates like Feb 31)
          if (
            testDate.getFullYear() === fullYear &&
            testDate.getMonth() + 1 === month &&
            testDate.getDate() === day
          ) {
            return isoString;
          } else {
            console.warn(`[normalizeDateValue] Calendrically invalid date for column "${columnName}": ${trimmed} → ${isoString}`);
            return null;
          }
        }
      }

      // Try parsing as generic date string
      const testDate = new Date(trimmed);
      if (!isNaN(testDate.getTime())) {
        return testDate.toISOString().split('T')[0];
      }
    }

    // Unhandled type
    console.warn(`[normalizeDateValue] Unhandled date type for column "${columnName}":`, typeof value, value);
    return null;
  } catch (error) {
    console.error(`[normalizeDateValue] Error parsing date for column "${columnName}":`, value, error);
    return null;
  }
}

/**
 * Extract ALL 38 columns from row data for database storage.
 * Maps Excel column names to database column names.
 *
 * CRITICAL: Uses renamed column names:
 * - "Filial" = filial (filial de roteirização)
 * - "Filial (origem)" = filial_origem (filial de onde a carga chegou)
 */
function extractTypedColumns(row: any) {
  // Extract the two filial values using renamed column names
  const filial = row['Filial'] ? String(row['Filial']) : undefined;
  const filialOrigem = row['Filial (origem)'] ? String(row['Filial (origem)']) : undefined;

  return {
    filial,
    romane: row['Romane'] ? String(row['Romane']) : undefined,
    filial_origem: filialOrigem,
    serie: row['Série'] ? String(row['Série']) : undefined,
    nro_doc: row['Nro Doc.'] ? String(row['Nro Doc.']) : undefined,
    data_des: normalizeDateValue(row['Data Des'], 'Data Des'),
    data_nf: normalizeDateValue(row['Data NF'], 'Data NF'),
    dle: normalizeDateValue(row['D.L.E.'], 'D.L.E.'),
    agendam: normalizeDateValue(row['Agendam.'], 'Agendam.'),
    palet: row['Palet'] ? String(row['Palet']) : undefined,
    conf: row['Conf'] ? String(row['Conf']) : undefined,
    peso: parseNumber(row['Peso']),
    vlr_merc: parseNumber(row['Vlr.Merc.']),
    qtd: parseNumber(row['Qtd.']),
    peso_c: parseNumber(row['Peso C']),
    classifi: row['Classifi'] ? String(row['Classifi']) : undefined,
    tomador: row['Tomador'] ? String(row['Tomador']) : undefined,
    destinatario: row['Destinatário'] ? String(row['Destinatário']) : undefined,
    bairro: row['Bairro'] ? String(row['Bairro']) : undefined,
    cida: row['Cida'] ? String(row['Cida']) : undefined,
    uf: row['UF'] ? String(row['UF']) : undefined,
    nf_serie: row['NF / Serie'] ? String(row['NF / Serie']) : undefined,
    tipo_carga: row['Tipo Carga'] ? String(row['Tipo Carga']) : undefined,
    qtd_nf: parseNumber(row['Qtd.NF']),
    regiao: row['Região'] ? String(row['Região']) : undefined,
    sub_regiao: row['Sub-Região'] ? String(row['Sub-Região']) : undefined,
    ocorrencias_nfs: row['Ocorrências NFs'] ? String(row['Ocorrências NFs']) : undefined,
    remetente: row['Remetente'] ? String(row['Remetente']) : undefined,
    observacao_r: row['Observação R'] ? String(row['Observação R']) : undefined,
    ref_cliente: row['Ref Cliente'] ? String(row['Ref Cliente']) : undefined,
    cidade_dest: row['Cidade Dest.'] ? String(row['Cidade Dest.']) : undefined,
    mesoregiao: row['Mesoregião'] ? String(row['Mesoregião']) : undefined,
    agenda: row['Agenda'] ? String(row['Agenda']) : undefined,
    tipo_c: row['Tipo C'] ? String(row['Tipo C']) : undefined,
    ultima: row['Última'] ? String(row['Última']) : undefined,
    status: row['Status'] ? String(row['Status']) : undefined,
    lat: parseNumber(row['Lat.']),
    lon: parseNumber(row['Lon.']),
  };
}

/**
 * Process uploaded Excel file from raw REC export.
 * Handles automatic cleaning and validation of the official REC layout.
 *
 * Flow:
 * 1. Read raw Excel file starting from row 5 (L5)
 * 2. Remove empty columns (__EMPTY*)
 * 3. Validate exact sequence of 38 non-empty columns
 * 4. Process and persist data (NO renaming - columns stay as exported)
 */
export async function processCarteiraUpload(
  file: File,
  usuarioId: string,
  filialId: string
): Promise<UploadResult> {
  try {
    // STEP 1: Read raw file starting from row 5 (L5 - where data begins)
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { raw: false, defval: '' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON starting from row 5 (header row in REC file)
    let jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: '',
      range: 4, // Start from row 5 (0-indexed, so row 5 = index 4)
    }) as any[];

    if (jsonData.length === 0) {
      return {
        success: false,
        total_linhas: 0,
        total_validas: 0,
        total_invalidas: 0,
        error: 'Arquivo vazio ou sem dados a partir da linha 5',
      };
    }

    // STEP 2: Extract raw headers from first data row and remove invalid columns
    const rawHeaders = Object.keys(jsonData[0]);
    console.log('[DEBUG] 1. Headers brutos originais:', rawHeaders.length, rawHeaders);

    const cleanedHeaders = removerColunasVazias(rawHeaders);
    console.log('[DEBUG] 2. Headers após remoção de colunas vazias:', cleanedHeaders.length, cleanedHeaders);

    // STEP 2.5: Normalize header names (trim, collapse spaces, remove technical suffixes)
    const normalizedHeaders = cleanedHeaders.map(h => normalizeHeaderName(h));
    console.log('[DEBUG] 3. Headers após normalização:', normalizedHeaders.length, normalizedHeaders);

    // STEP 2.6: Rename the 2nd "Filial" to "Filial (origem)"
    const renamedHeaders = renomearFilialOrigem(normalizedHeaders);
    console.log('[DEBUG] 4. Headers finais após renomeação:', renamedHeaders.length, renamedHeaders);

    // STEP 3: Validate exact sequence of 38 non-empty columns
    const structureValidation = validarOrdemExataBruta(renamedHeaders);
    if (!structureValidation.valid) {
      // Create upload record with error
      const { data: upload } = await supabase
        .from('uploads_carteira')
        .insert({
          nome_arquivo: file.name,
          usuario_id: usuarioId,
          filial_id: filialId,
          total_linhas: 0,
          total_validas: 0,
          total_invalidas: 0,
          status: 'erro',
          erro_estrutura: structureValidation.errorMessage,
        })
        .select()
        .single();

      return {
        success: false,
        uploadId: upload?.id,
        total_linhas: 0,
        total_validas: 0,
        total_invalidas: 0,
        error: structureValidation.errorMessage,
      };
    }

    // STEP 4: Remove invalid columns, normalize headers, and rename "Filial" columns in all data rows
    jsonData = jsonData.map(row => {
      const cleanedRow: any = {};
      let filialCount = 0;

      Object.keys(row).forEach(key => {
        if (!isInvalidColumnName(key)) {
          // Normalize the key name
          const normalizedKey = normalizeHeaderName(key);

          // Rename the 2nd "Filial" to "Filial (origem)"
          if (normalizedKey === 'Filial') {
            filialCount++;
            if (filialCount === 2) {
              cleanedRow['Filial (origem)'] = row[key];
            } else {
              cleanedRow[normalizedKey] = row[key];
            }
          } else {
            cleanedRow[normalizedKey] = row[key];
          }
        }
      });
      return cleanedRow;
    });

    // STEP 5: Data is now clean and validated - proceed with processing
    // Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from('uploads_carteira')
      .insert({
        nome_arquivo: file.name,
        usuario_id: usuarioId,
        filial_id: filialId,
        total_linhas: jsonData.length,
        status: 'processando',
      })
      .select()
      .single();

    if (uploadError || !upload) {
      throw new Error(uploadError?.message || 'Erro ao criar registro de upload');
    }

    // Process rows
    const items: CarteiraItem[] = [];
    let validCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      // Log raw values from first row for debugging
      if (i === 0) {
        console.log('\n[DEBUG] ========== VALORES BRUTOS DA PRIMEIRA LINHA ==========');
        console.log('[DEBUG] ROMANE:', row['Romane']);
        console.log('[DEBUG] Datas:');
        console.log('  - Data Des (bruto):', row['Data Des'], '(tipo:', typeof row['Data Des'], ')');
        console.log('  - Data NF (bruto):', row['Data NF'], '(tipo:', typeof row['Data NF'], ')');
        console.log('  - D.L.E. (bruto):', row['D.L.E.'], '(tipo:', typeof row['D.L.E.'], ')');
        console.log('  - Agendam. (bruto):', row['Agendam.'], '(tipo:', typeof row['Agendam.'], ')');
        console.log('  - Agenda (bruto):', row['Agenda'], '(tipo:', typeof row['Agenda'], ')');
        console.log('[DEBUG] Números:');
        console.log('  - Peso (bruto):', row['Peso'], '(tipo:', typeof row['Peso'], ')');
        console.log('  - Vlr.Merc. (bruto):', row['Vlr.Merc.'], '(tipo:', typeof row['Vlr.Merc.'], ')');
        console.log('  - Peso C (bruto):', row['Peso C'], '(tipo:', typeof row['Peso C'], ')');
      }

      const validation = validateCarteiraRow(row);
      const typedColumns = extractTypedColumns(row);

      // Log converted values from first row
      if (i === 0) {
        console.log('\n[DEBUG] ========== VALORES CONVERTIDOS DA PRIMEIRA LINHA ==========');
        console.log('[DEBUG] ROMANE:', typedColumns.romane);
        console.log('[DEBUG] Datas:');
        console.log('  - data_des (convertido):', typedColumns.data_des);
        console.log('  - data_nf (convertido):', typedColumns.data_nf);
        console.log('  - dle (convertido):', typedColumns.dle);
        console.log('  - agendam (convertido):', typedColumns.agendam);
        console.log('  - agenda (convertido):', typedColumns.agenda);
        console.log('[DEBUG] Números:');
        console.log('  - peso (convertido):', typedColumns.peso);
        console.log('  - vlr_merc (convertido):', typedColumns.vlr_merc);
        console.log('  - peso_c (convertido):', typedColumns.peso_c);
      }

      items.push({
        upload_id: upload.id,
        linha_numero: i + 2, // +2 because Excel is 1-indexed and row 1 is header
        status_validacao: validation.status,
        erro_validacao: validation.erro,
        ...typedColumns,
      });

      if (validation.status === 'valida') {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    // Log specific romane 432 before insert
    const romane432 = items.find(item => item.romane === '432');
    if (romane432) {
      console.log('\n[DEBUG] ========== ROMANE 432 - DADOS ANTES DO INSERT ==========');
      console.log('[DEBUG] linha_numero:', romane432.linha_numero);
      console.log('[DEBUG] Datas:');
      console.log('  - data_des:', romane432.data_des);
      console.log('  - data_nf:', romane432.data_nf);
      console.log('  - dle:', romane432.dle);
      console.log('  - agendam:', romane432.agendam);
      console.log('  - agenda:', romane432.agenda);
      console.log('[DEBUG] Números:');
      console.log('  - peso:', romane432.peso);
      console.log('  - vlr_merc:', romane432.vlr_merc);
      console.log('  - peso_c:', romane432.peso_c);
      console.log('[DEBUG] Outros:');
      console.log('  - tipo_c:', romane432.tipo_c);
      console.log('  - ultima:', romane432.ultima);
    }

    // Insert items in batches
    const batchSize = 500;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Log first item of first batch for debugging date conversions
      if (i === 0 && batch.length > 0) {
        console.log('\n[DEBUG] ========== PRIMEIRO ITEM DO BATCH A SER INSERIDO ==========');
        console.log('  - linha_numero:', batch[0].linha_numero);
        console.log('  - romane:', batch[0].romane);
        console.log('  - data_des:', batch[0].data_des);
        console.log('  - data_nf:', batch[0].data_nf);
        console.log('  - dle:', batch[0].dle);
        console.log('  - agendam:', batch[0].agendam);
      }

      // Validate all date fields before insert
      for (const item of batch) {
        const dateFields = [
          { name: 'data_des', value: item.data_des },
          { name: 'data_nf', value: item.data_nf },
          { name: 'dle', value: item.dle },
          { name: 'agendam', value: item.agendam },
        ];

        for (const field of dateFields) {
          if (field.value !== null && field.value !== undefined) {
            // Must be a string in YYYY-MM-DD format
            if (typeof field.value !== 'string') {
              throw new Error(
                `Linha ${item.linha_numero}: Campo "${field.name}" deve ser string ou null, recebeu ${typeof field.value}: ${field.value}`
              );
            }

            // Validate ISO format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(field.value)) {
              throw new Error(
                `Linha ${item.linha_numero}: Campo "${field.name}" não está em formato ISO (YYYY-MM-DD): "${field.value}"`
              );
            }

            // Validate it's a valid date
            const testDate = new Date(field.value);
            if (isNaN(testDate.getTime())) {
              throw new Error(
                `Linha ${item.linha_numero}: Campo "${field.name}" contém data inválida: "${field.value}"`
              );
            }
          }
        }
      }

      const { error: insertError } = await supabase
        .from('carteira_itens')
        .insert(batch);

      if (insertError) {
        throw new Error(`Erro ao inserir lote ${i / batchSize + 1}: ${insertError.message}`);
      }
    }

    // Validate romane 432 after insert
    if (romane432) {
      const { data: savedRomane432, error: queryError } = await supabase
        .from('carteira_itens')
        .select('romane, data_des, data_nf, dle, agendam, agenda, peso, vlr_merc, peso_c, tipo_c, ultima')
        .eq('romane', '432')
        .eq('upload_id', upload.id)
        .maybeSingle();

      if (!queryError && savedRomane432) {
        console.log('\n[DEBUG] ========== ROMANE 432 - COMPARAÇÃO ANTES/DEPOIS ==========');
        console.log('[DEBUG] Datas:');
        console.log('  - data_des    | Enviado:', romane432.data_des, '| Salvo:', savedRomane432.data_des);
        console.log('  - data_nf     | Enviado:', romane432.data_nf, '| Salvo:', savedRomane432.data_nf);
        console.log('  - dle         | Enviado:', romane432.dle, '| Salvo:', savedRomane432.dle);
        console.log('  - agendam     | Enviado:', romane432.agendam, '| Salvo:', savedRomane432.agendam);
        console.log('  - agenda      | Enviado:', romane432.agenda, '| Salvo:', savedRomane432.agenda);
        console.log('[DEBUG] Números:');
        console.log('  - peso        | Enviado:', romane432.peso, '| Salvo:', savedRomane432.peso);
        console.log('  - vlr_merc    | Enviado:', romane432.vlr_merc, '| Salvo:', savedRomane432.vlr_merc);
        console.log('  - peso_c      | Enviado:', romane432.peso_c, '| Salvo:', savedRomane432.peso_c);
        console.log('[DEBUG] Outros:');
        console.log('  - tipo_c      | Enviado:', romane432.tipo_c, '| Salvo:', savedRomane432.tipo_c);
        console.log('  - ultima      | Enviado:', romane432.ultima, '| Salvo:', savedRomane432.ultima);
      }
    }

    // Update upload record
    const { error: updateError } = await supabase
      .from('uploads_carteira')
      .update({
        total_validas: validCount,
        total_invalidas: invalidCount,
        status: 'concluido',
      })
      .eq('id', upload.id);

    if (updateError) {
      throw new Error('Erro ao atualizar registro de upload');
    }

    return {
      success: true,
      uploadId: upload.id,
      total_linhas: jsonData.length,
      total_validas: validCount,
      total_invalidas: invalidCount,
    };
  } catch (error) {
    console.error('Erro ao processar upload:', error);
    return {
      success: false,
      total_linhas: 0,
      total_validas: 0,
      total_invalidas: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao processar arquivo',
    };
  }
}

/**
 * Get upload details by ID
 */
export async function getUploadById(uploadId: string) {
  const { data, error } = await supabase
    .from('uploads_carteira')
    .select('*, filiais(nome)')
    .eq('id', uploadId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get carteira items with pagination and filters
 */
export async function getCarteiraItems(
  uploadId: string,
  limit = 50,
  offset = 0,
  filters?: {
    status_validacao?: 'valida' | 'invalida';
    filial?: string;
    uf?: string;
    destinatario?: string;
    cida?: string;
    tomador?: string;
    data_des_inicio?: string;
    data_des_fim?: string;
    dle_inicio?: string;
    dle_fim?: string;
    agendam_inicio?: string;
    agendam_fim?: string;
  }
) {
  let query = supabase
    .from('carteira_itens')
    .select('*', { count: 'exact' })
    .eq('upload_id', uploadId)
    .order('linha_numero', { ascending: true })
    .range(offset, offset + limit - 1);

  if (filters?.status_validacao) {
    query = query.eq('status_validacao', filters.status_validacao);
  }

  if (filters?.filial) {
    query = query.ilike('filial', `%${filters.filial}%`);
  }

  if (filters?.uf) {
    query = query.eq('uf', filters.uf);
  }

  if (filters?.destinatario) {
    query = query.ilike('destinatario', `%${filters.destinatario}%`);
  }

  if (filters?.cida) {
    query = query.ilike('cida', `%${filters.cida}%`);
  }

  if (filters?.tomador) {
    query = query.ilike('tomador', `%${filters.tomador}%`);
  }

  if (filters?.data_des_inicio) {
    query = query.gte('data_des', filters.data_des_inicio);
  }

  if (filters?.data_des_fim) {
    query = query.lte('data_des', filters.data_des_fim);
  }

  if (filters?.dle_inicio) {
    query = query.gte('dle', filters.dle_inicio);
  }

  if (filters?.dle_fim) {
    query = query.lte('dle', filters.dle_fim);
  }

  if (filters?.agendam_inicio) {
    query = query.gte('agendam', filters.agendam_inicio);
  }

  if (filters?.agendam_fim) {
    query = query.lte('agendam', filters.agendam_fim);
  }

  const { data, error, count } = await query;

  if (error) throw error;
  return { items: data || [], count: count || 0 };
}

/**
 * Get recent uploads for a user/filial
 */
export async function getRecentUploads(filialId?: string, limit = 10) {
  let query = supabase
    .from('uploads_carteira')
    .select('*, filiais(nome)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filialId) {
    query = query.eq('filial_id', filialId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Generate payload for routing process.
 * Fetches all valid carteira items, vehicles, and regionalidades.
 */
export async function montarPayloadRoteirizacao(
  uploadId: string,
  usuarioId: string,
  usuarioNome: string,
  filialId: string,
  filialNome: string,
  filters?: {
    status_validacao?: 'valida' | 'invalida';
    filial?: string;
    uf?: string;
    destinatario?: string;
    cida?: string;
    tomador?: string;
    data_des_inicio?: string;
    data_des_fim?: string;
    dle_inicio?: string;
    dle_fim?: string;
    agendam_inicio?: string;
    agendam_fim?: string;
  }
) {
  try {
    let carteiraQuery = supabase
      .from('carteira_itens')
      .select('*')
      .eq('upload_id', uploadId)
      .eq('status_validacao', 'valida');

    if (filters?.filial) {
      carteiraQuery = carteiraQuery.ilike('filial', `%${filters.filial}%`);
    }

    if (filters?.uf) {
      carteiraQuery = carteiraQuery.eq('uf', filters.uf);
    }

    if (filters?.destinatario) {
      carteiraQuery = carteiraQuery.ilike('destinatario', `%${filters.destinatario}%`);
    }

    if (filters?.cida) {
      carteiraQuery = carteiraQuery.ilike('cida', `%${filters.cida}%`);
    }

    if (filters?.tomador) {
      carteiraQuery = carteiraQuery.ilike('tomador', `%${filters.tomador}%`);
    }

    if (filters?.data_des_inicio) {
      carteiraQuery = carteiraQuery.gte('data_des', filters.data_des_inicio);
    }

    if (filters?.data_des_fim) {
      carteiraQuery = carteiraQuery.lte('data_des', filters.data_des_fim);
    }

    if (filters?.dle_inicio) {
      carteiraQuery = carteiraQuery.gte('dle', filters.dle_inicio);
    }

    if (filters?.dle_fim) {
      carteiraQuery = carteiraQuery.lte('dle', filters.dle_fim);
    }

    if (filters?.agendam_inicio) {
      carteiraQuery = carteiraQuery.gte('agendam', filters.agendam_inicio);
    }

    if (filters?.agendam_fim) {
      carteiraQuery = carteiraQuery.lte('agendam', filters.agendam_fim);
    }

    const { data: carteiraItems, error: carteiraError } = await carteiraQuery;

    if (carteiraError) throw carteiraError;

    const { data: veiculos, error: veiculosError } = await supabase
      .from('veiculos')
      .select('*')
      .eq('filial_id', filialId)
      .eq('ativo', true);

    if (veiculosError) throw veiculosError;

    const { data: regionalidades, error: regionalidadesError } = await supabase
      .from('regionalidades')
      .select('*');

    if (regionalidadesError) throw regionalidadesError;

    // Reconstruct Excel format from database columns
    const carteira = carteiraItems?.map((item) => ({
      'Filial': item.filial || '',
      'Romane': item.romane || '',
      'Filial (origem)': item.filial_origem || '',
      'Série': item.serie || '',
      'Nro Doc.': item.nro_doc || '',
      'Data Des': item.data_des || '',
      'Data NF': item.data_nf || '',
      'D.L.E.': item.dle || '',
      'Agendam.': item.agendam || '',
      'Palet': item.palet || '',
      'Conf': item.conf || '',
      'Peso': item.peso || 0,
      'Vlr.Merc.': item.vlr_merc || 0,
      'Qtd.': item.qtd || 0,
      'Peso C': item.peso_c || 0,
      'Classifi': item.classifi || '',
      'Tomador': item.tomador || '',
      'Destinatário': item.destinatario || '',
      'Bairro': item.bairro || '',
      'Cida': item.cida || '',
      'UF': item.uf || '',
      'NF / Serie': item.nf_serie || '',
      'Tipo Carga': item.tipo_carga || '',
      'Qtd.NF': item.qtd_nf || 0,
      'Região': item.regiao || '',
      'Sub-Região': item.sub_regiao || '',
      'Ocorrências NFs': item.ocorrencias_nfs || '',
      'Remetente': item.remetente || '',
      'Observação R': item.observacao_r || '',
      'Ref Cliente': item.ref_cliente || '',
      'Cidade Dest.': item.cidade_dest || '',
      'Mesoregião': item.mesoregiao || '',
      'Agenda': item.agenda || '',
      'Tipo C': item.tipo_c || '',
      'Última': item.ultima || '',
      'Status': item.status || '',
      'Lat.': item.lat || 0,
      'Lon.': item.lon || 0,
    })) || [];

    const payload = {
      carteira,
      veiculos: veiculos || [],
      regionalidades: regionalidades || [],
      parametros: {
        usuario_id: usuarioId,
        usuario_nome: usuarioNome,
        filial_id: filialId,
        filial_nome: filialNome,
        data_execucao: new Date().toISOString(),
        filtros_aplicados: filters || {},
      },
    };

    if (carteira.length === 0) {
      throw new Error('Nenhuma linha válida encontrada para roteirização');
    }

    if (!veiculos || veiculos.length === 0) {
      throw new Error('Nenhum veículo ativo encontrado para a filial');
    }

    return payload;
  } catch (error) {
    console.error('Erro ao montar payload de roteirização:', error);
    throw error;
  }
}
