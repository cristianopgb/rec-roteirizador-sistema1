/**
 * Column Mapping Configuration - V2 Structure (43 columns)
 *
 * Maps Excel column names to database field names with transformation functions.
 * This provides a centralized, declarative way to handle all column transformations.
 *
 * IMPORTANT: "Data" column is transformed into BOTH data_des and data_nf (same value)
 */

import {
  parseIntegerSafe,
  parseDateBR,
  parseDateTimeBR,
  parseNumberBR,
  parseDecimal,
  parseTextSafe,
  parseHorarioBR,
  parseCarroDedicado,
  parseRestricaoVeiculo,
  parsePrioridade,
} from '../utils/column-transformers';

/**
 * Maps Excel column names to database fields with transformation functions.
 * Covers the 43-column V2 structure exactly as received from REC ERP.
 */
export const COLUMN_TRANSFORMATION_MAP: Record<
  string,
  {
    field: string;
    transform: (value: any) => any;
  }
> = {
  // ==================== INTEGER FIELDS ====================
  'Filial R': { field: 'filial_r', transform: parseIntegerSafe },
  'Romane': { field: 'romane', transform: parseIntegerSafe },
  'Filial D': { field: 'filial_d', transform: parseIntegerSafe },
  'Série': { field: 'serie', transform: parseIntegerSafe },
  'Nro Doc.': { field: 'nro_doc', transform: parseIntegerSafe },
  'Qtd.': { field: 'qtd', transform: parseIntegerSafe },
  'Qtd.NF': { field: 'qtd_nf', transform: parseIntegerSafe },
  'Palet': { field: 'palet', transform: parseIntegerSafe },

  // ==================== DATE FIELDS ====================
  // NOTE: Excel has TWO "Data" columns with same name - we rename them internally
  'Data_Des_Internal': { field: 'data_des', transform: parseDateBR },
  'Data_NF_Internal': { field: 'data_nf', transform: parseDateBR },
  'D.L.E.': { field: 'dle', transform: parseDateBR },

  // ==================== TIMESTAMP FIELD ====================
  'Agendam.': { field: 'agendam', transform: parseDateTimeBR },

  // ==================== DECIMAL NUMBER FIELDS ====================
  'Peso': { field: 'peso', transform: parseNumberBR },
  'Vlr.Merc.': { field: 'vlr_merc', transform: parseNumberBR },
  'Peso Cub.': { field: 'peso_cubico', transform: parseNumberBR },
  'Peso Calculo': { field: 'peso_calculo', transform: parseNumberBR },

  // ==================== COORDINATE FIELDS ====================
  'Latitude': { field: 'latitude', transform: parseDecimal },
  'Longitude': { field: 'longitude', transform: parseDecimal },

  // ==================== TIME FIELDS (V2 NEW) ====================
  'Inicio Ent.': { field: 'inicio_entrega', transform: parseHorarioBR },
  'Fim En': { field: 'fim_entrega', transform: parseHorarioBR },

  // ==================== ENUM FIELDS (V2 NEW) ====================
  'Prioridade': { field: 'prioridade', transform: parsePrioridade },
  'Restrição Veículo': { field: 'restricao_veiculo', transform: parseRestricaoVeiculo },

  // ==================== BOOLEAN FIELDS (V2 NEW) ====================
  'Carro Dedicado': { field: 'carro_dedicado', transform: parseCarroDedicado },

  // ==================== TEXT FIELDS ====================
  'Conf': { field: 'conf', transform: parseTextSafe },
  'Classif': { field: 'classif', transform: parseTextSafe },
  'Tomad': { field: 'tomad', transform: parseTextSafe },
  'Destin': { field: 'destin', transform: parseTextSafe },
  'Bairro': { field: 'bairro', transform: parseTextSafe },
  'Cidad': { field: 'cidade', transform: parseTextSafe },
  'UF': { field: 'uf', transform: parseTextSafe },
  'NF / Serie': { field: 'nf_serie', transform: parseTextSafe },
  'Tipo Carga': { field: 'tipo_carga', transform: parseTextSafe },
  'Tipo Ca': { field: 'tipo_ca', transform: parseTextSafe },
  'Sub-Região': { field: 'sub_regiao', transform: parseTextSafe },
  'Ocorrências NF': { field: 'ocorrencias_nf', transform: parseTextSafe },
  'Remetente': { field: 'remetente', transform: parseTextSafe },
  'Observação': { field: 'observacao', transform: parseTextSafe },
  'Ref Cliente': { field: 'ref_cliente', transform: parseTextSafe },
  'Cidade Dest.': { field: 'cidade_dest', transform: parseTextSafe },
  'Mesoregião': { field: 'mesoregiao', transform: parseTextSafe },
  'Agenda': { field: 'agenda', transform: parseTextSafe },
  'Última Ocorrência': { field: 'ultima_ocorrencia', transform: parseTextSafe },
  'Status R': { field: 'status_r', transform: parseTextSafe },
};
