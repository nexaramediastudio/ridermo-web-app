-- Standalone income entries (not linked to a sale)
ALTER TABLE public.commission_records
  ALTER COLUMN sale_id DROP NOT NULL;

ALTER TABLE public.commission_records
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.commission_records
  ADD COLUMN IF NOT EXISTS income_date DATE DEFAULT CURRENT_DATE;

-- Replace sale+category unique with partial index (sale-linked only)
ALTER TABLE public.commission_records
  DROP CONSTRAINT IF EXISTS commission_records_sale_id_category_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_records_sale_category
  ON public.commission_records(sale_id, category)
  WHERE sale_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_commission_records_income_date
  ON public.commission_records(income_date);
