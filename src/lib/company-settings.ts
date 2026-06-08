import { createClient } from "@/lib/supabase/client";

export const COMPANY_SETTINGS_ID = "default";
export const LOGO_STORAGE_BUCKET = "company-assets";
export const LOGO_STORAGE_PATH = "logo";

export interface CompanySettings {
  id: string;
  company_name: string;
  tagline: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  website: string | null;
  reg_number: string | null;
  tax_number: string | null;
  updated_at?: string;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: COMPANY_SETTINGS_ID,
  company_name: "RIDERMO",
  tagline: "Premium TVS Dealership",
  logo_url: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  website: null,
  reg_number: null,
  tax_number: null,
};

export async function fetchCompanySettings(): Promise<CompanySettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("id", COMPANY_SETTINGS_ID)
    .maybeSingle();

  if (error || !data) return DEFAULT_COMPANY_SETTINGS;
  return data as CompanySettings;
}

export async function saveCompanySettings(
  input: Omit<CompanySettings, "id" | "updated_at">,
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("company_settings").upsert({
    id: COMPANY_SETTINGS_ID,
    ...input,
    updated_at: new Date().toISOString(),
  });

  return { error: error?.message ?? null };
}

function logoPathForFile(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp", "svg"].includes(ext) ? ext : "png";
  return `${LOGO_STORAGE_PATH}.${safeExt === "jpeg" ? "jpg" : safeExt}`;
}

export async function uploadCompanyLogo(file: File): Promise<{ url: string | null; error: string | null }> {
  if (!file.type.startsWith("image/")) {
    return { url: null, error: "Please upload an image file (PNG, JPG, WebP, or SVG)" };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { url: null, error: "Logo must be 2MB or smaller" };
  }

  const supabase = createClient();
  const path = logoPathForFile(file);

  const { error: uploadError } = await supabase.storage
    .from(LOGO_STORAGE_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data } = supabase.storage.from(LOGO_STORAGE_BUCKET).getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  return { url, error: null };
}

export async function removeCompanyLogo(logoUrl: string | null): Promise<{ error: string | null }> {
  const supabase = createClient();

  if (logoUrl) {
    const marker = `/storage/v1/object/public/${LOGO_STORAGE_BUCKET}/`;
    const idx = logoUrl.indexOf(marker);
    if (idx !== -1) {
      const pathWithQuery = logoUrl.slice(idx + marker.length);
      const path = pathWithQuery.split("?")[0];
      await supabase.storage.from(LOGO_STORAGE_BUCKET).remove([path]);
    }
  }

  const { error } = await supabase
    .from("company_settings")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("id", COMPANY_SETTINGS_ID);

  return { error: error?.message ?? null };
}
