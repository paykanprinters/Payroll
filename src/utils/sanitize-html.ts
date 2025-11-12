"use client";

import DOMPurify from "dompurify";

/**
 * Sanitize arbitrary HTML to prevent XSS.
 * - Removes scripts, event handlers, and javascript: URLs
 * - Keeps basic formatting tags and safe attributes
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    // Use DOMPurify defaults which already strip scripts and dangerous URLs.
    USE_PROFILES: { html: true },
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}