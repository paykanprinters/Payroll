import type { Page } from "playwright";

const ALLOWED_PREFIXES = ["data:", "about:", "blob:"];

/** Block outbound network during dev HTML→PDF render (SSRF mitigation). */
export async function blockExternalNetworkRequests(page: Page): Promise<void> {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (ALLOWED_PREFIXES.some((prefix) => url.startsWith(prefix))) {
      void route.continue();
      return;
    }
    void route.abort("blockedbyclient");
  });
}
