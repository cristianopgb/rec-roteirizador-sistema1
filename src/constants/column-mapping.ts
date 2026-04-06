/**
 * Column Mapping Configuration
 *
 * Maps Excel column names to database field names with transformation functions.
 * This provides a centralized, declarative way to handle all column transformations.
 */

import {
  parseIntegerSafe,
  parseDateBR,
  parseDateTimeBR,
  parseNumberBR,
  parseDecimal,
  parseTextSafe,
} from '../utils/column-transformers';

/**
 * Maps Excel column names to database fields with transformation functions
 */
export const COLUMN_TRANSFORMATION_MAP: Record<
  string,
  {
    field: string;
    transform: (value: any) => any;
  }
> = {
  // ==================== INTEGER FIELDS ====================
  'Filial': { field: 'filial', transform: parseIntegerSafe },
  'Romane': { field: 'romane', transform: parseIntegerSafe },
  'Filial (origem)': { field: 'filial_origem', transform: parseIntegerSafe },
  'Série': { field: 'serie', transform: parseIntegerSafe },
  'Nro Doc.': { field: 'nro_doc', transform: parseIntegerSafe },
  'Qtd.': { field: 'qtd', transform: parseIntegerSafe },
  'Qtd.NF': { field: 'qtd_nf', transform: parseIntegerSafe },
  'Palet': { field: 'palet', transform: parseIntegerSafe },

  // ==================== DATE FIELDS ====================
  'Data Des': { field: 'data_des', transform: parseDateBR },
  'Data NF': { field: 'data_nf', transform: parseDateBR },
  'D.L.E.': { field: 'dle', transform: parseDateBR },

  // ==================== TIMESTAMP FIELD ====================
  'Agendam.': { field: 'agendam', transform: parseDateTimeBR },

  // ==================== DECIMAL NUMBER FIELDS ====================
  'Peso': { field: 'peso', transform: parseNumberBR },
  'Vlr.Merc.': { field: 'vlr_merc', transform: parseNumberBR },
  'Peso C': { field: 'peso_c', transform: parseNumberBR },

  // ==================== COORDINATE FIELDS ====================
  'Lat.': { field: 'lat', transform: parseDecimal },
  'Lon.': { field: 'lon', transform: parseDecimal },

  // ==================== TEXT FIELDS ====================
  'Conf': {
    field: 'conf',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Classifi': {
    field: 'classifi',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Tomador': {
    field: 'tomador',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Destinatário': {
    field: 'destinatario',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Bairro': {
    field: 'bairro',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Cida': {
    field: 'cida',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'UF': {
    field: 'uf',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'NF / Serie': {
    field: 'nf_serie',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Tipo Carga': {
    field: 'tipo_carga',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Região': {
    field: 'regiao',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Sub-Região': {
    field: 'sub_regiao',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Ocorrências NFs': {
    field: 'ocorrencias_nfs',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v)),
  },
  'Remetente': {
    field: 'remetente',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Observação R': {
    field: 'observacao_r',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Ref Cliente': {
    field: 'ref_cliente',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Cidade Dest.': {
    field: 'cidade_dest',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Mesoregião': {
    field: 'mesoregiao',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Agenda': {
    field: 'agenda',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Tipo C': {
    field: 'tipo_c',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Última': {
    field: 'ultima',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },
  'Status': {
    field: 'status',
    transform: (v: any) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v))
  },

  // ==================== NEW COLUMNS (Sprint 4) ====================
  'Veiculo Exclusivo': { field: 'veiculo_exclusivo', transform: parseTextSafe },
  'Peso Calculado': { field: 'peso_calculado', transform: parseNumberBR },
  'Prioridade': { field: 'prioridade', transform: parseIntegerSafe },
};
