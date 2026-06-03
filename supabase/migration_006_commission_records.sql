-- ── Commission Records (revenue recognized only when Received) ──────────
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS commission_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  category      text NOT NULL CHECK (category IN ('tvs', 'finance', 'insurance', 'transport', 'documentation', 'other')),
  amount        numeric NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received')),
  received_at   timestamptz,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (sale_id, category)
);

CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status);
CREATE INDEX IF NOT EXISTS idx_commission_records_received_at ON commission_records(received_at);
CREATE INDEX IF NOT EXISTS idx_commission_records_sale_id ON commission_records(sale_id);

ALTER TABLE commission_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_commission_records" ON commission_records;
CREATE POLICY "auth_commission_records"
  ON commission_records FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Worker payouts: pending until sale commissions are fully received
ALTER TABLE worker_commissions
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

-- Backfill commission records from existing sales (treat as already received)
INSERT INTO commission_records (sale_id, category, amount, status, received_at)
SELECT id, 'tvs', tvs_commission, 'received', created_at FROM sales WHERE COALESCE(tvs_commission, 0) > 0
ON CONFLICT (sale_id, category) DO NOTHING;

INSERT INTO commission_records (sale_id, category, amount, status, received_at)
SELECT id, 'finance', finance_commission, 'received', created_at FROM sales WHERE COALESCE(finance_commission, 0) > 0
ON CONFLICT (sale_id, category) DO NOTHING;

INSERT INTO commission_records (sale_id, category, amount, status, received_at)
SELECT id, 'insurance', insurance_commission, 'received', created_at FROM sales WHERE COALESCE(insurance_commission, 0) > 0
ON CONFLICT (sale_id, category) DO NOTHING;

INSERT INTO commission_records (sale_id, category, amount, status, received_at)
SELECT id, 'transport', transport_charges, 'received', created_at FROM sales WHERE COALESCE(transport_charges, 0) > 0
ON CONFLICT (sale_id, category) DO NOTHING;

INSERT INTO commission_records (sale_id, category, amount, status, received_at)
SELECT id, 'documentation', documentation_charges, 'received', created_at FROM sales WHERE COALESCE(documentation_charges, 0) > 0
ON CONFLICT (sale_id, category) DO NOTHING;

INSERT INTO commission_records (sale_id, category, amount, status, received_at)
SELECT id, 'other', other_earnings, 'received', created_at FROM sales WHERE COALESCE(other_earnings, 0) > 0
ON CONFLICT (sale_id, category) DO NOTHING;

-- Mark existing worker commissions as received (legacy data)
UPDATE worker_commissions SET status = 'received', received_at = COALESCE(received_at, created_at)
WHERE status IS NULL OR status = 'pending';
