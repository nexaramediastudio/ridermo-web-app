-- ============================================================
-- MIGRATION 002: Used Bikes, Spare Parts, Accessories
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- USED BIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.used_bikes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  make TEXT NOT NULL DEFAULT 'TVS',
  model_name TEXT NOT NULL,
  year INT,
  color TEXT,
  registration_number TEXT,
  chassis_number TEXT,
  engine_number TEXT,
  odometer INT DEFAULT 0,
  condition TEXT NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  purchase_price DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved', 'not_for_sale')),
  purchase_date DATE DEFAULT CURRENT_DATE,
  sold_date DATE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.used_bikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access used_bikes" ON public.used_bikes
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_used_bikes_status ON public.used_bikes(status);

-- ============================================================
-- SPARE PARTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  part_number TEXT,
  name TEXT NOT NULL,
  brand TEXT DEFAULT 'TVS',
  category TEXT DEFAULT 'other' CHECK (category IN (
    'engine', 'body', 'electrical', 'brakes', 'suspension',
    'transmission', 'fuel_system', 'tyres', 'oil_filters', 'other'
  )),
  compatible_models TEXT,
  quantity INT DEFAULT 0,
  reorder_level INT DEFAULT 5,
  cost_price DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) DEFAULT 0,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access spare_parts" ON public.spare_parts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON public.spare_parts(category);

-- ============================================================
-- ACCESSORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accessories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sku TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT DEFAULT 'other' CHECK (category IN (
    'helmet', 'gloves', 'jacket', 'riding_gear', 'locks',
    'covers', 'lights', 'mirrors', 'bags', 'other'
  )),
  size TEXT,
  color TEXT,
  quantity INT DEFAULT 0,
  reorder_level INT DEFAULT 3,
  cost_price DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access accessories" ON public.accessories
  FOR ALL USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_accessories_category ON public.accessories(category);

SELECT 'Migration 002 completed' AS status;
