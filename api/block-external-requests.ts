import type { Page } from "puppeteer-core";

const ALLOWED_PREFIXES = ["data:", "about:", "blob:"];

/**
 * Block outbound network during HTML→PDF render (SSRF mitigation).
 * Inline HTML/CSS and data-URI images still work.
 */
export async function blockExternalNetworkRequests(page: Page): Promise<void> {
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const url = request.url();
    if (ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      void request.continue();
      return;
    }
    void request.abort("blockedbyclient");
  });
}
