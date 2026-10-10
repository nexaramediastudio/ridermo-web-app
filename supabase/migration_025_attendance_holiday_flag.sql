-- Holiday can be marked together with Present. Salary uses it only when Present is also selected.
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS is_holiday BOOLEAN NOT NULL DEFAULT false;
