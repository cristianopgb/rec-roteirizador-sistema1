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
import { COLUMN_TRANSFORMATION_MAP } from '../constants/column-mapping';
import { parseNumberBR } from '../utils/column-transformers';

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
 * V2 structure no longer needs filial renaming.
 * Headers now come as "Filial R" and "Filial D" directly from Excel.
 */
function renomearFilialOrigem(headers: string[]): string[] {
  return headers;
}

/**
 * Validates EXACT order and names of the 43 raw columns from REC file V2.
 * This validation happens on the SEQUENCE of non-empty columns (not original sheet indices).
 * NO tolerance for different order or names.
 *
 * CRITICAL: V2 structure expects "Filial R" and "Filial D" (not "Filial").
 * CRITICAL: V2 uses TWO "Data" columns (both with the same name "Data").
 */
function validarOrdemExataBruta(headers: string[]): StructureValidationResult {
  // Must have exactly 43 columns after removing empty ones
  if (headers.length !== 43) {
    const columnsInfo = `Colunas encontradas: [${headers.join(', ')}]`;
    return {
      valid: false,
      errorMessage: `Arquivo fora do layout oficial da carteira REC V2 após limpeza de colunas inválidas. Esperado: 43 colunas, encontrado: ${headers.length}. ${columnsInfo}`,
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

  // INTEGER FIELDS
  filial_r?: number;
  romane?: number;
  filial_d?: number;
  serie?: number;
  nro_doc?: number;
  qtd?: number;
  qtd_nf?: number;
  palet?: number;

  // DATE FIELDS (YYYY-MM-DD)
  data_des?: string | null;
  data_nf?: string | null;
  dle?: string | null;

  // TIMESTAMP FIELD (YYYY-MM-DD HH:MM:SS)
  agendam?: string | null;

  // DECIMAL NUMBER FIELDS
  peso?: number;
  vlr_merc?: number;
  peso_cubico?: number;
  latitude?: number;
  longitude?: number;
  peso_calculo?: number;

  // TEXT FIELDS
  conf?: string;
  classif?: string;
  tomad?: string;
  destin?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  nf_serie?: string;
  tipo_carga?: string;
  tipo_ca?: string;
  sub_regiao?: string;
  ocorrencias_nf?: string;
  remetente?: string;
  observacao?: string;
  ref_cliente?: string;
  cidade_dest?: string;
  mesoregiao?: string;
  agenda?: string;
  ultima_ocorrencia?: string;
  status_r?: string;

  // V2 NEW COLUMNS - ROUTING ENHANCEMENTS
  prioridade?: string;
  restricao_veiculo?: string;
  carro_dedicado?: boolean;
  inicio_entrega?: string | null;
  fim_entrega?: string | null;
}


/**
 * Validates a single carteira row - V2 structure.
 * Operates on row object with EXACT Excel column names.
 *
 * IMPORTANT: This function now performs NO CONTENT VALIDATION.
 * It accepts all rows as valid regardless of their content.
 * All business logic validation will be performed by the downstream system.
 *
 * This is a "passive receiver" that only validates structure (done elsewhere).
 */
export function validateCarteiraRow(
  row: Partial<CarteiraExcelRow>
): RowValidationResult {
  return { status: 'valida' };
}


/**
 * Apply column transformations using the centralized mapping.
 * Maps Excel column names to database column names and applies type transformations.
 *
 * NOTE: Excel has two "Data" columns (renamed to Data_Des_Internal and Data_NF_Internal)
 */
function applyColumnTransformations(rowObject: any): any {
  const result: any = {};

  for (const [excelColumnName, config] of Object.entries(COLUMN_TRANSFORMATION_MAP)) {
    const rawValue = rowObject[excelColumnName];
    const transformedValue = config.transform(rawValue);
    result[config.field] = transformedValue;
  }

  return result;
}

/**
 * Extract ALL 50 columns from row data for database storage - V2 structure.
 * Maps Excel column names to database column names.
 *
 * CRITICAL: V2 uses direct column names:
 * - "Filial R" = filial_r (filial de roteirização)
 * - "Filial D" = filial_d (filial de destino)
 * - Two "Data" columns (internally renamed to Data_Des_Internal and Data_NF_Internal)
 */
function extractTypedColumns(row: any) {
  return applyColumnTransformations(row);
}

/**
 * Process uploaded Excel file from raw REC export.
 * Handles automatic cleaning and validation of the official REC layout.
 *
 * Flow:
 * 1. Read raw Excel file starting from row 5 (L5)
 * 2. Remove empty columns (__EMPTY*)
 * 3. Validate exact sequence of 50 non-empty columns
 * 4. Process and persist data (NO renaming - columns stay as exported)
 */
export async function processCarteiraUpload(
  file: File,
  usuarioId: string,
  filialId: string
): Promise<UploadResult> {
  try {
    // ============================================================================
    // STEP 1: Read Excel in RAW MODE (array of arrays) to avoid truncation
    // ============================================================================
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      raw: true,
      dense: true,
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to array of arrays (NOT object mode) starting from row 5 (header row)
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Return arrays instead of objects
      raw: true, // Keep raw cell values
      defval: null, // Use null for empty cells
      blankrows: false, // Skip blank rows
      range: 4, // Start from row 5 (0-indexed, so row 5 = index 4)
    }) as any[][];

    if (rawData.length === 0) {
      return {
        success: false,
        total_linhas: 0,
        total_validas: 0,
        total_invalidas: 0,
        error: 'Arquivo vazio ou sem dados a partir da linha 5',
      };
    }

    // ============================================================================
    // STEP 2: Extract and process header row (first row of rawData)
    // ============================================================================
    const rawHeaderRow = rawData[0];
    if (!rawHeaderRow || rawHeaderRow.length === 0) {
      return {
        success: false,
        total_linhas: 0,
        total_validas: 0,
        total_invalidas: 0,
        error: 'Linha de cabeçalho não encontrada',
      };
    }

    console.log('[DEBUG] 1. Headers brutos originais (total:', rawHeaderRow.length, ')');

    // ============================================================================
    // STEP 3: Remove invalid columns by index and build valid column mapping
    // ============================================================================
    const validColumnIndices: number[] = [];
    const rawHeaders: string[] = [];

    rawHeaderRow.forEach((header: any, index: number) => {
      if (!isInvalidColumnName(header)) {
        validColumnIndices.push(index);
        rawHeaders.push(String(header || ''));
      }
    });

    console.log('[DEBUG] 2. Índices válidos:', validColumnIndices);
    console.log('[DEBUG] 3. Headers após remoção de colunas vazias:', rawHeaders.length, rawHeaders);

    // ============================================================================
    // STEP 4: Normalize header names
    // ============================================================================
    const normalizedHeaders = rawHeaders.map(h => normalizeHeaderName(h));
    console.log('[DEBUG] 4. Headers após normalização:', normalizedHeaders.length, normalizedHeaders);

    // ============================================================================
    // STEP 5: Rename the 2nd "Filial" to "Filial (origem)"
    // ============================================================================
    const renamedHeaders = renomearFilialOrigem(normalizedHeaders);
    console.log('[DEBUG] 5. Headers finais após renomeação:', renamedHeaders.length, renamedHeaders);

    // ============================================================================
    // STEP 6: Validate exact sequence of 50 non-empty columns
    // ============================================================================
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

    // ============================================================================
    // STEP 7: Process data rows using column indices (not object keys)
    // ============================================================================
    const dataRows = rawData.slice(1); // Skip header row
    const jsonData: any[] = [];

    for (const rawRow of dataRows) {
      const rowObject: any = {};

      // Map each valid column by index
      // Special handling for duplicate "Data" column names
      let dataColumnCount = 0;
      validColumnIndices.forEach((colIndex, mappingIndex) => {
        let headerName = renamedHeaders[mappingIndex];
        const cellValue = rawRow[colIndex];

        // Handle duplicate "Data" columns by renaming internally
        if (headerName === 'Data') {
          dataColumnCount++;
          if (dataColumnCount === 1) {
            headerName = 'Data_Des_Internal'; // First "Data" = Data Des
          } else if (dataColumnCount === 2) {
            headerName = 'Data_NF_Internal'; // Second "Data" = Data NF
          }
        }

        rowObject[headerName] = cellValue;
      });

      // FORENSIC ANALYSIS: For ROMANE 564, log raw array structure
      if (String(rowObject['Romane']).trim() === '564') {
        console.log('\n[DEBUG] ========== ROMANE 564 - ARRAY BRUTO COMPLETO ==========');
        console.log('[DEBUG] Array length:', rawRow.length);
        console.log('[DEBUG] Array completo:');
        rawRow.forEach((val, idx) => {
          console.log(`  Índice ${idx}: ${JSON.stringify(val)} (tipo: ${typeof val})`);
        });

        console.log('\n[DEBUG] ========== MAPEAMENTO DE ÍNDICES ==========');
        console.log('[DEBUG] validColumnIndices:', validColumnIndices);
        console.log('[DEBUG] renamedHeaders:', renamedHeaders);

        // Find indices for critical columns
        const dataDes_idx = renamedHeaders.indexOf('Data Des');
        const dataNF_idx = renamedHeaders.indexOf('Data NF');
        const dle_idx = renamedHeaders.indexOf('D.L.E.');
        const agendam_idx = renamedHeaders.indexOf('Agendam.');

        console.log('\n[DEBUG] Mapeamento de colunas críticas:');
        console.log(`  Data Des    → Índice no header: ${dataDes_idx}  | Índice físico no array: ${validColumnIndices[dataDes_idx]}  | Valor: ${JSON.stringify(rawRow[validColumnIndices[dataDes_idx]])}`);
        console.log(`  Data NF     → Índice no header: ${dataNF_idx}  | Índice físico no array: ${validColumnIndices[dataNF_idx]}  | Valor: ${JSON.stringify(rawRow[validColumnIndices[dataNF_idx]])}`);
        console.log(`  D.L.E.      → Índice no header: ${dle_idx}  | Índice físico no array: ${validColumnIndices[dle_idx]}  | Valor: ${JSON.stringify(rawRow[validColumnIndices[dle_idx]])}`);
        console.log(`  Agendam.    → Índice no header: ${agendam_idx}  | Índice físico no array: ${validColumnIndices[agendam_idx]}  | Valor: ${JSON.stringify(rawRow[validColumnIndices[agendam_idx]])}`);

        // Check neighbors for D.L.E.
        const dle_physical_idx = validColumnIndices[dle_idx];
        console.log('\n[DEBUG] ========== VARREDURA DE VIZINHOS D.L.E. ==========');
        console.log(`  Índice ${dle_physical_idx - 1} (anterior): ${JSON.stringify(rawRow[dle_physical_idx - 1])} (tipo: ${typeof rawRow[dle_physical_idx - 1]})`);
        console.log(`  Índice ${dle_physical_idx} (esperado): ${JSON.stringify(rawRow[dle_physical_idx])} (tipo: ${typeof rawRow[dle_physical_idx]})`);
        console.log(`  Índice ${dle_physical_idx + 1} (posterior): ${JSON.stringify(rawRow[dle_physical_idx + 1])} (tipo: ${typeof rawRow[dle_physical_idx + 1]})`);

        // Check neighbors for Agendam.
        const agendam_physical_idx = validColumnIndices[agendam_idx];
        console.log('\n[DEBUG] ========== VARREDURA DE VIZINHOS AGENDAM. ==========');
        console.log(`  Índice ${agendam_physical_idx - 1} (anterior): ${JSON.stringify(rawRow[agendam_physical_idx - 1])} (tipo: ${typeof rawRow[agendam_physical_idx - 1]})`);
        console.log(`  Índice ${agendam_physical_idx} (esperado): ${JSON.stringify(rawRow[agendam_physical_idx])} (tipo: ${typeof rawRow[agendam_physical_idx]})`);
        console.log(`  Índice ${agendam_physical_idx + 1} (posterior): ${JSON.stringify(rawRow[agendam_physical_idx + 1])} (tipo: ${typeof rawRow[agendam_physical_idx + 1]})`);
      }

      jsonData.push(rowObject);
    }

    console.log('[DEBUG] 6. Total de linhas de dados processadas:', jsonData.length);

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

      // Log raw values for ROMANE 564
      if (String(row['Romane']).trim() === '564') {
        console.log('\n========== ROMANE 564 - VALORES BRUTOS ==========');
        console.log('BRUTO | Filial:', row['Filial'], '(tipo:', typeof row['Filial'], ')');
        console.log('BRUTO | Romane:', row['Romane'], '(tipo:', typeof row['Romane'], ')');
        console.log('BRUTO | D.L.E.:', row['D.L.E.'], '(tipo:', typeof row['D.L.E.'], ')');
        console.log('BRUTO | Agendam.:', row['Agendam.'], '(tipo:', typeof row['Agendam.'], ')');
        console.log('BRUTO | Peso:', row['Peso'], '(tipo:', typeof row['Peso'], ')');
        console.log('BRUTO | Qtd.:', row['Qtd.'], '(tipo:', typeof row['Qtd.'], ')');
      }

      const validation = validateCarteiraRow(row);
      const typedColumns = extractTypedColumns(row);

      // Log transformed values for ROMANE 564
      if (String(row['Romane']).trim() === '564') {
        console.log('\n========== ROMANE 564 - VALORES TRANSFORMADOS ==========');
        console.log('TRANSFORMADO | filial:', typedColumns.filial, '(tipo:', typeof typedColumns.filial, ')');
        console.log('TRANSFORMADO | romane:', typedColumns.romane, '(tipo:', typeof typedColumns.romane, ')');
        console.log('TRANSFORMADO | dle:', typedColumns.dle);
        console.log('TRANSFORMADO | agendam:', typedColumns.agendam);
        console.log('TRANSFORMADO | peso:', typedColumns.peso, '(tipo:', typeof typedColumns.peso, ')');
        console.log('TRANSFORMADO | qtd:', typedColumns.qtd, '(tipo:', typeof typedColumns.qtd, ')');
      }

      items.push({
        upload_id: upload.id,
        linha_numero: i + 6, // Header is row 5, data starts at row 6
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

    // Log specific romane 564 before insert
    const romane564 = items.find(item => String(item.romane).trim() === '564');
    if (romane564) {
      console.log('\n[DEBUG] ========== ROMANE 564 - DADOS ANTES DO INSERT ==========');
      console.log('[DEBUG] linha_numero:', romane564.linha_numero);
      console.log('[DEBUG] Datas:');
      console.log('  - data_des:', romane564.data_des);
      console.log('  - data_nf:', romane564.data_nf);
      console.log('  - dle:', romane564.dle);
      console.log('  - agendam:', romane564.agendam);
      console.log('[DEBUG] Números:');
      console.log('  - peso:', romane564.peso);
      console.log('  - vlr_merc:', romane564.vlr_merc);
      console.log('  - peso_c:', romane564.peso_c);
      console.log('[DEBUG] Coordenadas:');
      console.log('  - lat:', romane564.lat);
      console.log('  - lon:', romane564.lon);
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

      // Validate all fields before insert
      for (const item of batch) {
        // Validate integer fields
        const integerFields = [
          { name: 'filial', value: item.filial },
          { name: 'romane', value: item.romane },
          { name: 'filial_origem', value: item.filial_origem },
          { name: 'serie', value: item.serie },
          { name: 'nro_doc', value: item.nro_doc },
          { name: 'qtd', value: item.qtd },
          { name: 'qtd_nf', value: item.qtd_nf },
          { name: 'palet', value: item.palet },
        ];

        for (const field of integerFields) {
          if (field.value !== null && field.value !== undefined) {
            if (typeof field.value !== 'number' || !Number.isInteger(field.value)) {
              throw new Error(
                `Linha ${item.linha_numero}: Campo "${field.name}" deve ser inteiro, recebeu ${typeof field.value}: ${field.value}`
              );
            }
          }
        }

        // Validate date fields (YYYY-MM-DD)
        const dateFields = [
          { name: 'data_des', value: item.data_des },
          { name: 'data_nf', value: item.data_nf },
          { name: 'dle', value: item.dle },
        ];

        for (const field of dateFields) {
          if (field.value !== null && field.value !== undefined) {
            if (typeof field.value !== 'string') {
              throw new Error(
                `Linha ${item.linha_numero}: Campo "${field.name}" deve ser string ou null, recebeu ${typeof field.value}: ${field.value}`
              );
            }

            if (!/^\d{4}-\d{2}-\d{2}$/.test(field.value)) {
              throw new Error(
                `Linha ${item.linha_numero}: Campo "${field.name}" não está em formato ISO (YYYY-MM-DD): "${field.value}"`
              );
            }

            const testDate = new Date(field.value);
            if (isNaN(testDate.getTime())) {
              throw new Error(
                `Linha ${item.linha_numero}: Campo "${field.name}" contém data inválida: "${field.value}"`
              );
            }
          }
        }

        // Validate timestamp field (YYYY-MM-DD HH:MM:SS)
        if (item.agendam !== null && item.agendam !== undefined) {
          if (typeof item.agendam !== 'string') {
            throw new Error(
              `Linha ${item.linha_numero}: Campo "agendam" deve ser string timestamp ou null, recebeu ${typeof item.agendam}: ${item.agendam}`
            );
          }
          if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(item.agendam)) {
            throw new Error(
              `Linha ${item.linha_numero}: Campo "agendam" não está em formato ISO timestamp (YYYY-MM-DD HH:MM:SS): "${item.agendam}"`
            );
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

    // Validate romane 564 after insert
    if (romane564 && String(romane564.romane).trim() === '564') {
      const { data: savedRomane564, error: queryError } = await supabase
        .from('carteira_itens')
        .select('filial, romane, dle, agendam, peso, qtd')
        .eq('romane', 564)
        .eq('upload_id', upload.id)
        .maybeSingle();

      if (!queryError && savedRomane564) {
        console.log('\n========== ROMANE 564 - VALORES SALVOS ==========');
        console.log('SALVO | filial:', savedRomane564.filial);
        console.log('SALVO | romane:', savedRomane564.romane);
        console.log('SALVO | dle:', savedRomane564.dle);
        console.log('SALVO | agendam:', savedRomane564.agendam);
        console.log('SALVO | peso:', savedRomane564.peso);
        console.log('SALVO | qtd:', savedRomane564.qtd);
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
    filial?: string | string[];
    uf?: string | string[];
    destinatario?: string | string[];
    cida?: string | string[];
    tomador?: string | string[];
    data_des_inicio?: string;
    data_des_fim?: string;
    dle_inicio?: string;
    dle_fim?: string;
    agendam_inicio?: string;
    agendam_fim?: string;
    data_nf_inicio?: string;
    data_nf_fim?: string;
    mesoregiao?: string | string[];
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
    if (Array.isArray(filters.filial)) {
      query = query.in('filial', filters.filial);
    } else {
      query = query.eq('filial', filters.filial);
    }
  }

  if (filters?.uf) {
    if (Array.isArray(filters.uf)) {
      query = query.in('uf', filters.uf);
    } else {
      query = query.eq('uf', filters.uf);
    }
  }

  if (filters?.destinatario) {
    if (Array.isArray(filters.destinatario)) {
      query = query.in('destinatario', filters.destinatario);
    } else {
      query = query.ilike('destinatario', `%${filters.destinatario}%`);
    }
  }

  if (filters?.cida) {
    if (Array.isArray(filters.cida)) {
      query = query.in('cida', filters.cida);
    } else {
      query = query.ilike('cida', `%${filters.cida}%`);
    }
  }

  if (filters?.tomador) {
    if (Array.isArray(filters.tomador)) {
      query = query.in('tomador', filters.tomador);
    } else {
      query = query.ilike('tomador', `%${filters.tomador}%`);
    }
  }

  if (filters?.mesoregiao) {
    if (Array.isArray(filters.mesoregiao)) {
      query = query.in('mesoregiao', filters.mesoregiao);
    } else {
      query = query.eq('mesoregiao', filters.mesoregiao);
    }
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

  if (filters?.data_nf_inicio) {
    query = query.gte('data_nf', filters.data_nf_inicio);
  }

  if (filters?.data_nf_fim) {
    query = query.lte('data_nf', filters.data_nf_fim);
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
    filial?: string | string[];
    uf?: string | string[];
    destinatario?: string | string[];
    cida?: string | string[];
    tomador?: string | string[];
    data_des_inicio?: string;
    data_des_fim?: string;
    dle_inicio?: string;
    dle_fim?: string;
    agendam_inicio?: string;
    agendam_fim?: string;
    data_nf_inicio?: string;
    data_nf_fim?: string;
    mesoregiao?: string | string[];
  }
) {
  try {
    let carteiraQuery = supabase
      .from('carteira_itens')
      .select('*')
      .eq('upload_id', uploadId)
      .eq('status_validacao', 'valida');

    if (filters?.filial) {
      if (Array.isArray(filters.filial)) {
        carteiraQuery = carteiraQuery.in('filial', filters.filial);
      } else {
        carteiraQuery = carteiraQuery.eq('filial', filters.filial);
      }
    }

    if (filters?.uf) {
      if (Array.isArray(filters.uf)) {
        carteiraQuery = carteiraQuery.in('uf', filters.uf);
      } else {
        carteiraQuery = carteiraQuery.eq('uf', filters.uf);
      }
    }

    if (filters?.destinatario) {
      if (Array.isArray(filters.destinatario)) {
        carteiraQuery = carteiraQuery.in('destinatario', filters.destinatario);
      } else {
        carteiraQuery = carteiraQuery.ilike('destinatario', `%${filters.destinatario}%`);
      }
    }

    if (filters?.cida) {
      if (Array.isArray(filters.cida)) {
        carteiraQuery = carteiraQuery.in('cida', filters.cida);
      } else {
        carteiraQuery = carteiraQuery.ilike('cida', `%${filters.cida}%`);
      }
    }

    if (filters?.tomador) {
      if (Array.isArray(filters.tomador)) {
        carteiraQuery = carteiraQuery.in('tomador', filters.tomador);
      } else {
        carteiraQuery = carteiraQuery.ilike('tomador', `%${filters.tomador}%`);
      }
    }

    if (filters?.mesoregiao) {
      if (Array.isArray(filters.mesoregiao)) {
        carteiraQuery = carteiraQuery.in('mesoregiao', filters.mesoregiao);
      } else {
        carteiraQuery = carteiraQuery.eq('mesoregiao', filters.mesoregiao);
      }
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

    if (filters?.data_nf_inicio) {
      carteiraQuery = carteiraQuery.gte('data_nf', filters.data_nf_inicio);
    }

    if (filters?.data_nf_fim) {
      carteiraQuery = carteiraQuery.lte('data_nf', filters.data_nf_fim);
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
      'Filial': item.filial ?? '',
      'Romane': item.romane ?? '',
      'Filial (origem)': item.filial_origem ?? '',
      'Série': item.serie ?? '',
      'Nro Doc.': item.nro_doc ?? '',
      'Data Des': item.data_des ?? '',
      'Data NF': item.data_nf ?? '',
      'D.L.E.': item.dle ?? '',
      'Agendam.': item.agendam ?? '',
      'Palet': item.palet ?? '',
      'Conf': item.conf ?? '',
      'Peso': item.peso ?? 0,
      'Vlr.Merc.': item.vlr_merc ?? 0,
      'Qtd.': item.qtd ?? 0,
      'Peso C': item.peso_c ?? 0,
      'Classifi': item.classifi ?? '',
      'Tomador': item.tomador ?? '',
      'Destinatário': item.destinatario ?? '',
      'Bairro': item.bairro ?? '',
      'Cida': item.cida ?? '',
      'UF': item.uf ?? '',
      'NF / Serie': item.nf_serie ?? '',
      'Tipo Carga': item.tipo_carga ?? '',
      'Qtd.NF': item.qtd_nf ?? 0,
      'Região': item.regiao ?? '',
      'Sub-Região': item.sub_regiao ?? '',
      'Ocorrências NFs': item.ocorrencias_nfs ?? '',
      'Remetente': item.remetente ?? '',
      'Observação R': item.observacao_r ?? '',
      'Ref Cliente': item.ref_cliente ?? '',
      'Cidade Dest.': item.cidade_dest ?? '',
      'Mesoregião': item.mesoregiao ?? '',
      'Agenda': item.agenda ?? '',
      'Tipo C': item.tipo_c ?? '',
      'Última': item.ultima ?? '',
      'Status': item.status ?? '',
      'Lat.': item.lat ?? 0,
      'Lon.': item.lon ?? 0,
      'Veiculo Exclusivo': item.veiculo_exclusivo ?? null,
      'Peso Calculado': item.peso_calculado ?? null,
      'Prioridade': item.prioridade ?? null,
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
