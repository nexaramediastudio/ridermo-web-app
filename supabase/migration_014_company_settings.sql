-- Company settings (singleton) + logo storage
CREATE TABLE IF NOT EXISTS public.company_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  company_name TEXT NOT NULL DEFAULT 'RIDERMO',
  tagline TEXT DEFAULT 'Premium TVS Dealership',
  logo_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  website TEXT,
  reg_number TEXT,
  tax_number TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.company_settings (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read company settings" ON public.company_settings;
CREATE POLICY "Public read company settings"
  ON public.company_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated manage company settings" ON public.company_settings;
CREATE POLICY "Authenticated manage company settings"
  ON public.company_settings FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket for company logo / assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read company assets" ON storage.objects;
CREATE POLICY "Public read company assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Authenticated upload company assets" ON storage.objects;
CREATE POLICY "Authenticated upload company assets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Authenticated update company assets" ON storage.objects;
CREATE POLICY "Authenticated update company assets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets');

DROP POLICY IF EXISTS "Authenticated delete company assets" ON storage.objects;
CREATE POLICY "Authenticated delete company assets"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets');
