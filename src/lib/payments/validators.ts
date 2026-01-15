"use client";

export const isValidAccountNumber = (acc?: string | null): boolean => {
  if (!acc) return false;
  const s = acc.replace(/\s+/g, "");
  // Accept digits, length 6–20 for general validation
  return /^[0-9]{6,20}$/.test(s);
};

export const isValidBranchCode = (code?: string | null): boolean => {
  if (!code) return false;
  const s = code.replace(/\s+/g, "");
  // Allow digits/alphanumeric 3–11 (handles routing/SWIFT-like codes loosely)
  return /^[A-Za-z0-9]{3,11}$/.test(s);
};