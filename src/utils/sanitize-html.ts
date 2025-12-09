import DOMPurify from "dompurify"
import { JSDOM } from "jsdom"

// SSR-safe initialization for DOMPurify
const window = (new JSDOM("").window as unknown) as Window
const purify = DOMPurify(window as unknown as Window)

export function sanitizeHTML(input: string): string {
  if (typeof input !== "string") return ""
  return purify.sanitize(input, {
    USE_PROFILES: { html: true }, // balanced whitelist of tags/attrs
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/(?:png|gif|jpeg|webp));|#)/i,
    FORBID_TAGS: ["script", "iframe", "object", "embed"],
    FORBID_ATTR: ["onerror", "onclick", "onload", "style"]
  })
}