import { supabase } from "@/integrations/supabase/client";
import { getDefaultCompanyLogoStorageUrl } from "@/lib/document-logo";

const LOGO_PATH = "/brand/kanprinters_horizontal_color.png";
const LOGO_WIDTH = 180;
const LOGO_HEIGHT = 60;
const LOGO_FIT = "contain" as const;
const BUCKET = "company-logos";
const OBJECT_PATH = "company_logo.png";
const SEED_FLAG = "kanBrandLogoSeededAt";

async function logoObjectExists(publicUrl: string): Promise<boolean> {
  try {
    const res = await fetch(publicUrl, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Upload bundled Kan logo to Supabase and sync payslip design settings (Admin session). */
export async function seedKanBrandLogo(force = false): Promise<{ ok: boolean; logoUrl?: string; skipped?: boolean }> {
  if (!force && typeof window !== "undefined" && sessionStorage.getItem(SEED_FLAG)) {
    return { ok: true, skipped: true };
  }

  const publicUrl = getDefaultCompanyLogoStorageUrl();
  if (!force && (await logoObjectExists(publicUrl))) {
    sessionStorage.setItem(SEED_FLAG, new Date().toISOString());
    return { ok: true, logoUrl: publicUrl, skipped: true };
  }

  const assetRes = await fetch(LOGO_PATH, { cache: "no-store" });
  if (!assetRes.ok) {
    return { ok: false };
  }

  const blob = await assetRes.blob();
  const file = new File([blob], "company_logo.png", { type: "image/png" });

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(OBJECT_PATH, file, {
    upsert: true,
    contentType: "image/png",
    cacheControl: "3600",
  });

  if (uploadError) {
    console.error("seedKanBrandLogo upload failed:", uploadError);
    return { ok: false };
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(OBJECT_PATH);
  const logoUrl = urlData.publicUrl;

  const { error: companyError } = await supabase.from("company_details").upsert(
    {
      id: "00000000-0000-0000-0000-000000000000",
      logourl: logoUrl,
      logowidth: LOGO_WIDTH,
      logoheight: LOGO_HEIGHT,
      logofit: LOGO_FIT,
    },
    { onConflict: "id" }
  );

  if (companyError) {
    console.error("seedKanBrandLogo company_details failed:", companyError);
    return { ok: false, logoUrl };
  }

  const { error: designError } = await supabase
    .from("payslip_design_settings")
    .update({
      payslip_logo_url: logoUrl,
      payslip_logo_width: LOGO_WIDTH,
      payslip_logo_height: LOGO_HEIGHT,
      payslip_logo_fit: LOGO_FIT,
      show_company_logo: true,
    })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (designError) {
    console.error("seedKanBrandLogo payslip_design_settings failed:", designError);
  }

  if (typeof window !== "undefined") {
    sessionStorage.setItem(SEED_FLAG, new Date().toISOString());
    localStorage.setItem("companyLogoUrl", logoUrl);
    localStorage.setItem("companyLogoWidth", String(LOGO_WIDTH));
    localStorage.setItem("companyLogoHeight", String(LOGO_HEIGHT));
    localStorage.setItem("companyLogoFit", LOGO_FIT);
    window.dispatchEvent(new Event("companyDetailsUpdated"));
    window.dispatchEvent(new Event("payslipDesignUpdated"));
  }

  return { ok: true, logoUrl };
}
