import DOMPurify, { sanitize as dompurifySanitize } from "dompurify";
import type { Config } from "dompurify";

const options: Config = {
  USE_PROFILES: { html: true },
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/(?:png|gif|jpeg|webp));|#)/i,
  FORBID_TAGS: ["script", "iframe", "object", "embed"],
  FORBID_ATTR: ["onerror", "onclick", "onload", "style"],
};

export function sanitizeHTML(input: string): string {
  if (typeof input !== "string") return "";
  const result = (DOMPurify.sanitize ?? dompurifySanitize)(input, options) as unknown as string;
  return result;
}

// Alias to satisfy existing imports
export const sanitizeHtml = sanitizeHTML;