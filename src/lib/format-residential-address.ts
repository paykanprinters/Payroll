/**
 * Compose structured residential address fields into a single-line permanent-address string.
 */
export function formatResidentialAddress(parts: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
}): string {
  return [parts.addressLine1, parts.addressLine2, parts.city, parts.province, parts.postalCode]
    .map((part) => (part ?? "").trim().replace(/,+$/, "").trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Whether permanent address should mirror residential.
 * True when permanent is empty, or still equals the last auto-synced / current residential value.
 */
export function shouldSyncPermanentAddress(
  permanentAddress: string | null | undefined,
  residentialFormatted: string,
  lastSynced: string | null,
): boolean {
  const current = (permanentAddress ?? "").trim();
  if (!residentialFormatted) return false;
  if (!current) return true;
  if (current === residentialFormatted) return true;
  if (lastSynced !== null && current === lastSynced) return true;
  return false;
}
