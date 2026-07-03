/**
 * South African 13-digit ID number helpers.
 * Digits 1–6 encode birth date as YYMMDD; digit 13 is a Luhn checksum.
 */

const SA_ID_PATTERN = /^\d{13}$/;

/** Strip spaces and keep digits only. */
export function normalizeSaIdNumber(value: string): string {
  return value.replace(/\D/g, "");
}

/** Validate format, embedded birth date, and checksum digit. */
export function isValidSaIdNumber(value: string): boolean {
  const id = normalizeSaIdNumber(value);
  if (!SA_ID_PATTERN.test(id)) return false;

  const birthDate = parseSaIdNumberDateOfBirth(id);
  if (!birthDate) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let digit = Number(id[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(id[12]);
}

/**
 * Extract birth date from a SA ID number as yyyy-MM-dd (HTML date input format).
 * Returns null when the ID is not 13 digits or the embedded date is invalid.
 */
export function parseSaIdNumberDateOfBirth(value: string): string | null {
  const id = normalizeSaIdNumber(value);
  if (!SA_ID_PATTERN.test(id)) return null;

  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;

  const currentYearSuffix = new Date().getFullYear() % 100;
  const fullYear = yy > currentYearSuffix ? 1900 + yy : 2000 + yy;

  const date = new Date(fullYear, mm - 1, dd);
  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) {
    return null;
  }

  const month = String(mm).padStart(2, "0");
  const day = String(dd).padStart(2, "0");
  return `${fullYear}-${month}-${day}`;
}
