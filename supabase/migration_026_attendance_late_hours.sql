-- Hours late. Payroll removes one hour of salary for each hour recorded here.
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS late_hours DECIMAL(4, 2) NOT NULL DEFAULT 0;
