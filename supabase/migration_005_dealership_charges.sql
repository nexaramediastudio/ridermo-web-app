-- ── Dealership earnings fields (actual revenue, not vehicle sale value) ──
-- Run this in Supabase SQL Editor

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS transport_charges numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS documentation_charges numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS other_earnings numeric DEFAULT 0 NOT NULL;
