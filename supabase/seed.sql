-- ============================================================
-- RIDERMO ERP - Seed Data
-- Run AFTER schema.sql
-- ============================================================

-- ============================================================
-- TVS BIKE MODELS (from RIDERMO price list)
-- ============================================================
INSERT INTO public.bike_models (name, tvs_category, bike_category, fuel_type, mrp, default_discount, selling_price) VALUES
  ('TVS NTORQ XP',      '2W', 'scooter',    'petrol',   899000, 60000,  839000),
  ('TVS NTORQ RE',      '2W', 'scooter',    'petrol',   849000, 50000,  799000),
  ('TVS NTORQ DISC',    '2W', 'scooter',    'petrol',   809000, 60000,  749000),
  ('TVS NTORQ DRUM',    '2W', 'scooter',    'petrol',   759000, 70000,  689000),
  ('TVS JUPITER',       '2W', 'scooter',    'petrol',   749000, 50000,  699000),
  ('TVS SPORT 110',     '2W', 'motorbike',  'petrol',   637000, 60000,  577000),
  ('TVS RAIDER 125',    '2W', 'motorbike',  'petrol',   849000, 100000, 749000),
  ('TVS APACHE 4V 160', '2W', 'motorbike',  'petrol',   999000, 90000,  909000),
  ('TVS RONIN 225',     '2W', 'motorbike',  'petrol',  1499000, 0,     1499000),
  ('XL 100 I TOUCH',    '2W', 'moped',      'petrol',   459000, 60000,  399000),
  ('TVS IQUBE S 3.5W',  '2W', 'scooter',    'electric', 899000, 100000, 799000)
ON CONFLICT DO NOTHING;

-- ============================================================
-- COMMON COLORS (can be linked to models as needed)
-- ============================================================
-- NTORQ XP colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS NTORQ XP')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Metallic Red', '#C0392B'),
  ('Matte Black', '#1A1A1A'),
  ('Pearl White', '#F5F5F5'),
  ('Racing Blue', '#1E3A8A')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- NTORQ RE colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS NTORQ RE')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Metallic Red', '#C0392B'),
  ('Matte Black', '#1A1A1A'),
  ('Pearl White', '#F5F5F5')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- NTORQ DISC colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS NTORQ DISC')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Metallic Red', '#C0392B'),
  ('Matte Black', '#1A1A1A'),
  ('Pearl White', '#F5F5F5'),
  ('Racing Blue', '#1E3A8A')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- NTORQ DRUM colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS NTORQ DRUM')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Metallic Red', '#C0392B'),
  ('Matte Black', '#1A1A1A'),
  ('Pearl White', '#F5F5F5')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- JUPITER colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS JUPITER')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Matte Silver', '#9E9E9E'),
  ('Pearl White', '#F5F5F5'),
  ('Mystic Gold', '#C9A84C'),
  ('Pristine Blue', '#2980B9')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- SPORT 110 colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS SPORT 110')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Black', '#1A1A1A'),
  ('Red', '#C0392B'),
  ('Blue', '#1E3A8A')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- RAIDER 125 colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS RAIDER 125')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Fiery Orange', '#FF4C00'),
  ('Matte Black', '#1A1A1A'),
  ('Pearl White', '#F5F5F5'),
  ('Racing Blue', '#1E3A8A')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- APACHE 4V 160 colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS APACHE 4V 160')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Matte Black', '#1A1A1A'),
  ('Pearl White', '#F5F5F5'),
  ('Sports Red', '#C0392B')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- RONIN 225 colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS RONIN 225')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Matte Black', '#1A1A1A'),
  ('Honey Beige', '#D4A574'),
  ('Slate Blue', '#4A5568')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- XL 100 colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'XL 100 I TOUCH')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Black', '#1A1A1A'),
  ('Red', '#C0392B')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- IQUBE colors
WITH m AS (SELECT id FROM public.bike_models WHERE name = 'TVS IQUBE S 3.5W')
INSERT INTO public.bike_colors (model_id, name, hex_code)
SELECT m.id, color.name, color.hex FROM m,
(VALUES
  ('Starlight Blue', '#1E3A8A'),
  ('Pristine White', '#F5F5F5'),
  ('Matte Black', '#1A1A1A')
) AS color(name, hex)
ON CONFLICT DO NOTHING;

-- ============================================================
-- EXPENSE CATEGORIES (reference data - already in CHECK constraint)
-- Just confirming the categories available:
-- rent, utilities, salary, broker_commission, bonus, petty_cash, other
-- ============================================================

-- ============================================================
-- SAMPLE FINANCE COMPANIES
-- ============================================================
INSERT INTO public.finance_companies (name, commission_rate) VALUES
  ('Seylan Bank', 2.50),
  ('HNB Finance', 2.00),
  ('Commercial Bank', 2.25),
  ('DFCC Bank', 2.00),
  ('Peoples Bank', 1.75),
  ('LB Finance', 3.00),
  ('Central Finance', 2.50),
  ('Singer Finance', 3.50),
  ('Alliance Finance', 3.00)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE INSURANCE COMPANIES
-- ============================================================
INSERT INTO public.insurance_companies (name, commission_rate) VALUES
  ('Janashakthi Insurance', 15.00),
  ('Ceylinco Insurance', 15.00),
  ('Sri Lanka Insurance', 12.00),
  ('Fairfirst Insurance', 14.00),
  ('HNB Assurance', 13.00),
  ('Union Assurance', 13.00)
ON CONFLICT DO NOTHING;
