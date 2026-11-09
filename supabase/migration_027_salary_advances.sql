-- Salary advances: give money mid-month, then deduct from payroll
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.salary_advances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_id UUID NOT NULL,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_advances_date ON public.salary_advances(advance_date);
CREATE INDEX IF NOT EXISTS idx_salary_advances_employee ON public.salary_advances(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_batch ON public.salary_advances(batch_id);

ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can access salary_advances" ON public.salary_advances;
CREATE POLICY "Authenticated users can access salary_advances"
  ON public.salary_advances FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
