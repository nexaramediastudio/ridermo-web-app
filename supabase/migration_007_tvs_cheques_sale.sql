-- Link TVS cheques to sold bikes (one cheque per sale)
ALTER TABLE public.cheques
  ADD COLUMN IF NOT EXISTS sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cheques_tvs_sale_unique
  ON public.cheques(sale_id)
  WHERE type = 'tvs' AND sale_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cheques_sale_id ON public.cheques(sale_id);
