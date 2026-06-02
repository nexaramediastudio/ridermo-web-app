-- ============================================================
-- MIGRATION 001: Update bike_models table
-- Run this in Supabase SQL Editor if you ran schema.sql before
-- the bike_models columns were added.
-- Safe to run multiple times.
-- ============================================================

-- Add missing columns to bike_models
ALTER TABLE public.bike_models
  ADD COLUMN IF NOT EXISTS tvs_category TEXT NOT NULL DEFAULT '2W',
  ADD COLUMN IF NOT EXISTS bike_category TEXT NOT NULL DEFAULT 'scooter',
  ADD COLUMN IF NOT EXISTS fuel_type TEXT NOT NULL DEFAULT 'petrol',
  ADD COLUMN IF NOT EXISTS mrp DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_discount DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Rename old 'category' column to 'tvs_category' if it exists
-- (only needed if you had the very first version of schema)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bike_models'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.bike_models RENAME COLUMN category TO tvs_category_old;
  END IF;
END $$;

-- Add check constraints (safe with IF NOT EXISTS equivalent)
ALTER TABLE public.bike_models
  DROP CONSTRAINT IF EXISTS bike_models_bike_category_check,
  DROP CONSTRAINT IF EXISTS bike_models_fuel_type_check,
  DROP CONSTRAINT IF EXISTS bike_models_tvs_category_check;

ALTER TABLE public.bike_models
  ADD CONSTRAINT bike_models_bike_category_check CHECK (bike_category IN ('scooter', 'motorbike', 'moped', '3w')),
  ADD CONSTRAINT bike_models_fuel_type_check CHECK (fuel_type IN ('petrol', 'electric', 'diesel')),
  ADD CONSTRAINT bike_models_tvs_category_check CHECK (tvs_category IN ('2W', '3W'));

-- Update bike_variants to add mrp/selling_price if missing
ALTER TABLE public.bike_variants
  ADD COLUMN IF NOT EXISTS mrp DECIMAL(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS selling_price DECIMAL(12, 2) DEFAULT 0;

-- Drop old 'price' column from bike_variants if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bike_variants'
      AND column_name = 'price'
  ) THEN
    ALTER TABLE public.bike_variants RENAME COLUMN price TO price_old;
  END IF;
END $$;

-- Also fix the typo in customers table (TIMESTANDPZ → TIMESTAMPTZ)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'updated_at'
  ) THEN
    -- column already exists, nothing to do
    NULL;
  ELSE
    ALTER TABLE public.customers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

SELECT 'Migration completed successfully' AS status;
