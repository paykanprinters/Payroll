/**
 * Normalize a South African mobile number to SMS Portal's international format.
 * Accepts 0XXXXXXXXX, 27XXXXXXXXX, +27XXXXXXXXX (spaces/dashes ignored).
 * Returns 27XXXXXXXXX or null when not a valid SA mobile number.
 */
export function normalizeSaMsisdn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);

  if (digits.startsWith("0") && digits.length === 10) {
    digits = "27" + digits.slice(1);
  } else if (digits.startsWith("27") && digits.length === 11) {
    // already international
  } else {
    return null;
  }

  if (!/^27[6-8]\d{8}$/.test(digits)) return null;
  return digits;
}

export function isValidSaMobile(raw: string | null | undefined): boolean {
  return normalizeSaMsisdn(raw) !== null;
}
