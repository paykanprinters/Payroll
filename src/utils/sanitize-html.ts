import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS.
 * - Strips <script> tags and event handlers (on*)
 * - Blocks dangerous URLs (javascript:, data: where risky)
 * - Allows basic formatting tags while removing unsafe attributes
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  const purifier = DOMPurify;

  // Configure DOMPurify once with conservative defaults
  purifier.setConfig({
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|ftp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Keep basic tags/attributes; DOMPurify maintains a secure default allowlist.
    // We rely on defaults; custom configs tend to under/over-allow.
    USE_PROFILES: { html: true }
  });

  // Add hooks to aggressively strip event handlers and javascript: urls
  purifier.addHook('uponSanitizeAttribute', (node, data) => {
    // Remove inline event handlers like onclick, onerror, etc.
    if (data.attrName && /^on/i.test(data.attrName)) {
      data.keepAttr = false;
    }

    // Block javascript: URLs anywhere
    if (data.attrName && typeof data.attrValue === 'string') {
      const val = data.attrValue.trim();
      if (/^javascript:/i.test(val)) {
        data.keepAttr = false;
      }
    }
  });

  // Strip dangerous tags explicitly (script, iframe with js URLs etc. handled by DOMPurify)
  purifier.addHook('uponSanitizeElement', (node, data) => {
    const tag = data.tagName?.toLowerCase();
    if (tag === 'script' || tag === 'base' || tag === 'object' || tag === 'embed') {
      data.allowedTags[data.tagName] = false;
    }
  });

  return purifier.sanitize(dirtyHtml);
}