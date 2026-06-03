-- ── Worker Commission System ──────────────────────────────────────
-- Run this in Supabase SQL Editor

-- 1. Add per_bike_commission to employees (amount a worker earns per bike sold on a day they attended)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS per_bike_commission numeric DEFAULT 0 NOT NULL;

-- 2. Create worker_commissions table (one row per worker per sale)
CREATE TABLE IF NOT EXISTS worker_commissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  employee_id   uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  sale_date     date NOT NULL,
  amount        numeric NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- 3. Indexes for fast payroll queries
CREATE INDEX IF NOT EXISTS idx_worker_commissions_employee ON worker_commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_worker_commissions_sale_date ON worker_commissions(sale_date);
CREATE INDEX IF NOT EXISTS idx_worker_commissions_sale_id ON worker_commissions(sale_id);

-- 4. RLS
ALTER TABLE worker_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_worker_commissions" ON worker_commissions;
CREATE POLICY "auth_worker_commissions"
  ON worker_commissions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
