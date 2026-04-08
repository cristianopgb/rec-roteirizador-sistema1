export enum RestricaoVeiculoEnum {
  TRUCK = 'TRUCK',
  VUC = 'VUC',
  CARRETA = 'CARRETA',
  UTILITARIO = 'UTILITARIO',
  TOCO = 'TOCO',
  BITRUCK = 'BITRUCK',
  QUALQUER = 'QUALQUER',
}

export enum PrioridadeEnum {
  ALTA = 'ALTA',
  MEDIA = 'MEDIA',
  BAIXA = 'BAIXA',
  URGENTE = 'URGENTE',
  NORMAL = 'NORMAL',
}

export const RESTRICAO_VEICULO_VALUES = Object.values(RestricaoVeiculoEnum);
export const PRIORIDADE_VALUES = Object.values(PrioridadeEnum);

export function normalizeRestricaoVeiculo(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;

  const normalized = value.trim().toUpperCase().replace(/[^A-Z]/g, '');

  if (RESTRICAO_VEICULO_VALUES.includes(normalized as RestricaoVeiculoEnum)) {
    return normalized;
  }

  return null;
}

export function normalizePrioridade(value: string | number | null | undefined): string | null {
  if (!value) return null;

  const strValue = String(value).trim().toUpperCase();

  const mapping: Record<string, string> = {
    'ALTA': PrioridadeEnum.ALTA,
    'HIGH': PrioridadeEnum.ALTA,
    '1': PrioridadeEnum.ALTA,
    'MEDIA': PrioridadeEnum.MEDIA,
    'MEDIUM': PrioridadeEnum.MEDIA,
    'MÉDIA': PrioridadeEnum.MEDIA,
    '2': PrioridadeEnum.MEDIA,
    'BAIXA': PrioridadeEnum.BAIXA,
    'LOW': PrioridadeEnum.BAIXA,
    '3': PrioridadeEnum.BAIXA,
    'URGENTE': PrioridadeEnum.URGENTE,
    'URGENT': PrioridadeEnum.URGENTE,
    '0': PrioridadeEnum.URGENTE,
    'NORMAL': PrioridadeEnum.NORMAL,
  };

  return mapping[strValue] || null;
}

export function normalizeCarroDedicado(value: string | boolean | null | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;

  const strValue = String(value).trim().toUpperCase();

  return ['S', 'SIM', 'YES', 'Y', 'TRUE', '1'].includes(strValue);
}
