-- Link leave records created from attendance marking
ALTER TABLE public.leaves
  ADD COLUMN IF NOT EXISTS attendance_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leaves_employee_attendance_date
  ON public.leaves(employee_id, attendance_date)
  WHERE attendance_date IS NOT NULL;
