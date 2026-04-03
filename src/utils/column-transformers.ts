/**
 * Column Transformation Functions
 *
 * These functions handle the transformation of Excel data to database-compatible formats.
 * Each function takes a raw value from Excel and returns the properly typed/formatted value.
 */

/**
 * Parses integer values safely
 * @param value - Raw value from Excel (can be number, string, etc)
 * @returns Integer number or null if invalid
 */
export function parseIntegerSafe(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If already a number, check if it's an integer
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      console.warn(`parseIntegerSafe: value is not an integer: ${value}`);
      return null;
    }
    return value;
  }

  // Convert to string and clean
  const strValue = String(value).trim();
  if (strValue === '') {
    return null;
  }

  // Parse as integer
  const parsed = parseInt(strValue, 10);

  // Validate that it's a valid integer and matches the original (no decimals)
  if (isNaN(parsed) || String(parsed) !== strValue) {
    console.warn(`parseIntegerSafe: could not parse as integer: "${strValue}"`);
    return null;
  }

  return parsed;
}

/**
 * Parses Brazilian date format (DD/MM/YYYY) to ISO date (YYYY-MM-DD)
 * @param value - Raw date value from Excel
 * @returns ISO date string or null if invalid
 */
export function parseDateBR(value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let strValue = String(value).trim();

  // Remove trailing comma if present
  if (strValue.endsWith(',')) {
    strValue = strValue.slice(0, -1).trim();
  }

  // If there's a space (datetime), only take the date part
  if (strValue.includes(' ')) {
    strValue = strValue.split(' ')[0].trim();
  }

  // Validate DD/MM/YYYY format
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = strValue.match(dateRegex);

  if (!match) {
    console.warn(`parseDateBR: invalid date format: "${strValue}"`);
    return null;
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  // Validate calendar date
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    console.warn(`parseDateBR: invalid calendar date: "${strValue}"`);
    return null;
  }

  // Return ISO format
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return isoDate;
}

/**
 * Parses Brazilian datetime format (DD/MM/YYYY HH:MM:SS) to ISO timestamp (YYYY-MM-DD HH:MM:SS)
 * @param value - Raw datetime value from Excel
 * @returns ISO timestamp string or null if invalid
 */
export function parseDateTimeBR(value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  let strValue = String(value).trim();

  // Remove trailing comma if present
  if (strValue.endsWith(',')) {
    strValue = strValue.slice(0, -1).trim();
  }

  // Split date and time parts
  const parts = strValue.split(' ');
  const datePart = parts[0];
  const timePart = parts[1] || '00:00:00';

  // Validate date part (DD/MM/YYYY)
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const dateMatch = datePart.match(dateRegex);

  if (!dateMatch) {
    console.warn(`parseDateTimeBR: invalid date format: "${datePart}"`);
    return null;
  }

  const day = parseInt(dateMatch[1], 10);
  const month = parseInt(dateMatch[2], 10);
  const year = parseInt(dateMatch[3], 10);

  // Validate calendar date
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    console.warn(`parseDateTimeBR: invalid calendar date: "${datePart}"`);
    return null;
  }

  // Validate time part (HH:MM:SS)
  const timeRegex = /^(\d{2}):(\d{2}):(\d{2})$/;
  const timeMatch = timePart.match(timeRegex);

  if (!timeMatch) {
    console.warn(`parseDateTimeBR: invalid time format: "${timePart}"`);
    return null;
  }

  const hour = parseInt(timeMatch[1], 10);
  const minute = parseInt(timeMatch[2], 10);
  const second = parseInt(timeMatch[3], 10);

  // Validate time ranges
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
    console.warn(`parseDateTimeBR: invalid time values: ${hour}:${minute}:${second}`);
    return null;
  }

  // Return ISO timestamp format
  const isoTimestamp = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
  return isoTimestamp;
}

/**
 * Parses Brazilian number format (1.250,39) or US format (1250.39) to number
 * Handles both thousands separators and decimal separators
 * @param value - Raw number value from Excel
 * @returns Decimal number or null if invalid
 */
export function parseNumberBR(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If already a number, return it
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return null;
    }
    return value;
  }

  // Convert to string and clean
  let strValue = String(value).trim();
  if (strValue === '') {
    return null;
  }

  // Detect format based on last separator
  const lastComma = strValue.lastIndexOf(',');
  const lastDot = strValue.lastIndexOf('.');

  let normalizedValue: string;

  if (lastComma > lastDot) {
    // Brazilian format: 1.250,39 or just ,39
    // Remove dots (thousands separator) and replace comma with dot
    normalizedValue = strValue.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // US format: 1,250.39 or just .39
    // Remove commas (thousands separator)
    normalizedValue = strValue.replace(/,/g, '');
  } else if (lastComma !== -1) {
    // Only comma present: assume Brazilian decimal
    normalizedValue = strValue.replace(',', '.');
  } else if (lastDot !== -1) {
    // Only dot present: assume US decimal
    normalizedValue = strValue;
  } else {
    // No separators: integer or invalid
    normalizedValue = strValue;
  }

  const parsed = Number(normalizedValue);

  if (isNaN(parsed) || !isFinite(parsed)) {
    console.warn(`parseNumberBR: could not parse as number: "${strValue}"`);
    return null;
  }

  return parsed;
}

/**
 * Parses decimal values (coordinates, etc.) in standard format
 * @param value - Raw decimal value
 * @returns Decimal number or null if invalid
 */
export function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // If already a number, return it
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return null;
    }
    return value;
  }

  // Convert to string and parse
  const strValue = String(value).trim();
  if (strValue === '') {
    return null;
  }

  const parsed = Number(strValue);

  if (isNaN(parsed) || !isFinite(parsed)) {
    console.warn(`parseDecimal: could not parse as decimal: "${strValue}"`);
    return null;
  }

  return parsed;
}
