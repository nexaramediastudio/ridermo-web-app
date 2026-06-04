-- Employee salary type, hourly rate, and optional EPF/ETF
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS salary_type TEXT NOT NULL DEFAULT 'monthly'
    CHECK (salary_type IN ('monthly', 'hourly'));

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS has_epf BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS has_etf BOOLEAN NOT NULL DEFAULT true;

-- Directors: default no EPF/ETF; workers keep defaults
UPDATE public.employees
SET has_epf = false, has_etf = false
WHERE type = 'director' AND salary_type = 'monthly';
