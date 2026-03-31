import * as XLSX from 'xlsx';
import { supabase } from './supabase';
import {
  COLUNAS_OBRIGATORIAS_EXCEL,
  EXCEL_TO_DB_MAP,
  CarteiraExcelRow,
  RowValidationResult,
  StructureValidationResult,
} from '../constants/carteira-columns';

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
  data_des?: string;
  data_nf?: string;
  dle?: string;
  agendam?: string;
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
 * Validates Excel file structure with EXACT column name matching.
 * NO normalization, NO transformation - strict string equality only.
 */
export function validateExcelStructure(
  headers: string[]
): StructureValidationResult {
  const missingColumns: string[] = [];
  const extraColumns: string[] = [];
  const mismatchedColumns: Array<{ expected: string; found: string }> = [];

  // Check for missing required columns (EXACT match)
  for (const requiredColumn of COLUNAS_OBRIGATORIAS_EXCEL) {
    if (!headers.includes(requiredColumn)) {
      missingColumns.push(requiredColumn);

      // Try to find similar column for helpful error message
      const similar = headers.find(
        h => h.toLowerCase() === requiredColumn.toLowerCase()
      );
      if (similar) {
        mismatchedColumns.push({ expected: requiredColumn, found: similar });
      }
    }
  }

  // Check for extra columns
  for (const header of headers) {
    if (!COLUNAS_OBRIGATORIAS_EXCEL.includes(header as any)) {
      extraColumns.push(header);
    }
  }

  const valid = missingColumns.length === 0 && extraColumns.length === 0;

  let errorMessage = '';
  if (!valid) {
    const errors: string[] = [];

    if (missingColumns.length > 0) {
      errors.push(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
    }

    if (mismatchedColumns.length > 0) {
      const details = mismatchedColumns
        .map(m => `"${m.found}" deveria ser "${m.expected}"`)
        .join(', ');
      errors.push(`Colunas com nome incorreto: ${details}`);
    }

    if (extraColumns.length > 0) {
      errors.push(`Colunas extras não esperadas: ${extraColumns.join(', ')}`);
    }

    errorMessage = errors.join(' | ');
  }

  return {
    valid,
    missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
    extraColumns: extraColumns.length > 0 ? extraColumns : undefined,
    mismatchedColumns: mismatchedColumns.length > 0 ? mismatchedColumns : undefined,
    errorMessage: errorMessage || undefined,
  };
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
 */
function parseNumber(value: any): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'number') {
    return value;
  }
  const num = parseFloat(String(value).replace(',', '.'));
  return isNaN(num) ? undefined : num;
}

/**
 * Safely parse a date value.
 */
function parseDate(value: any): string | undefined {
  if (!value) return undefined;

  // If it's already a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // If it's a string in dd/mm/yyyy format
  if (typeof value === 'string') {
    const parts = value.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return undefined;
}

/**
 * Extract ALL 38 columns from row data for database storage.
 * Maps Excel column names to database column names.
 */
function extractTypedColumns(row: Partial<CarteiraExcelRow>) {
  return {
    filial: row['Filial'] ? String(row['Filial']) : undefined,
    romane: row['Romane'] ? String(row['Romane']) : undefined,
    filial_origem: row['Filial (origem)'] ? String(row['Filial (origem)']) : undefined,
    serie: row['Série'] ? String(row['Série']) : undefined,
    nro_doc: row['Nro Doc.'] ? String(row['Nro Doc.']) : undefined,
    data_des: parseDate(row['Data Des']),
    data_nf: parseDate(row['Data NF']),
    dle: parseDate(row['D.L.E.']),
    agendam: parseDate(row['Agendam.']),
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
 * Process uploaded Excel file with EXACT column validation.
 * NO normalization allowed - file must match exactly or be rejected.
 */
export async function processCarteiraUpload(
  file: File,
  usuarioId: string,
  filialId: string
): Promise<UploadResult> {
  try {
    // Read file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { raw: false, defval: '' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with NO transformation
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: '',
    }) as Partial<CarteiraExcelRow>[];

    if (jsonData.length === 0) {
      return {
        success: false,
        total_linhas: 0,
        total_validas: 0,
        total_invalidas: 0,
        error: 'Arquivo vazio ou sem dados',
      };
    }

    // Extract headers from first row (EXACT - no normalization)
    const headers = Object.keys(jsonData[0]);

    // Validate structure with EXACT matching
    const structureValidation = validateExcelStructure(headers);
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
      const validation = validateCarteiraRow(row);
      const typedColumns = extractTypedColumns(row);

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

    // Insert items in batches
    const batchSize = 500;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('carteira_itens')
        .insert(batch);

      if (insertError) {
        throw new Error(`Erro ao inserir lote ${i / batchSize + 1}: ${insertError.message}`);
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
