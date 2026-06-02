-- Migration 003: Ensure leaves table exists
-- Run this in Supabase SQL Editor if the Leave page shows errors

CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sick', 'casual', 'annual', 'other')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days INT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if any, then recreate
DROP POLICY IF EXISTS "Authenticated users can access leaves" ON public.leaves;
CREATE POLICY "Authenticated users can access leaves"
  ON public.leaves FOR ALL
  USING (auth.role() = 'authenticated');

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leaves_employee_id ON public.leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leaves(status);
CREATE INDEX IF NOT EXISTS idx_leaves_from_date ON public.leaves(from_date);
