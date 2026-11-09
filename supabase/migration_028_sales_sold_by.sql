-- Who made the sale — that person gets the worker commission
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS sold_by UUID REFERENCES public.employees(id);

CREATE INDEX IF NOT EXISTS idx_sales_sold_by ON public.sales(sold_by);
