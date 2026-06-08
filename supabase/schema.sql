-- ============================================================
-- RIDERMO ERP - Initial Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (linked to Supabase Auth)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- EMPLOYEES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  employee_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  nic TEXT UNIQUE,
  address TEXT,
  email TEXT,
  type TEXT NOT NULL DEFAULT 'worker' CHECK (type IN ('director', 'worker')),
  department TEXT,
  designation TEXT,
  basic_salary DECIMAL(12, 2) DEFAULT 0,
  salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'hourly')),
  hourly_rate DECIMAL(12, 2) DEFAULT 0,
  has_epf BOOLEAN DEFAULT true,
  has_etf BOOLEAN DEFAULT true,
  per_bike_commission DECIMAL(12, 2) DEFAULT 0,
  join_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access employees" ON public.employees
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- TVS BIKE MODELS (Master Data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bike_models (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  tvs_category TEXT NOT NULL DEFAULT '2W' CHECK (tvs_category IN ('2W', '3W')),
  bike_category TEXT NOT NULL DEFAULT 'scooter' CHECK (bike_category IN ('scooter', 'motorbike', 'moped', '3w')),
  fuel_type TEXT NOT NULL DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'electric', 'diesel')),
  mrp DECIMAL(12, 2) DEFAULT 0,
  default_discount DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bike_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id UUID REFERENCES public.bike_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mrp DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bike_colors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  model_id UUID REFERENCES public.bike_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  hex_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.bike_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bike_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access bike_models" ON public.bike_models FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access bike_variants" ON public.bike_variants FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can access bike_colors" ON public.bike_colors FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- INVENTORY - TVS BIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_bikes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  round_number TEXT UNIQUE NOT NULL,
  chassis_number TEXT UNIQUE NOT NULL,
  engine_number TEXT UNIQUE NOT NULL,
  model_id UUID REFERENCES public.bike_models(id),
  variant_id UUID REFERENCES public.bike_variants(id),
  color_id UUID REFERENCES public.bike_colors(id),
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'sold', 'transferred', 'reserved')),
  purchase_price DECIMAL(12, 2) DEFAULT 0,
  selling_price DECIMAL(12, 2) DEFAULT 0,
  stock_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.inventory_bikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access inventory_bikes" ON public.inventory_bikes FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  phone2 TEXT,
  nic TEXT,
  address TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access customers" ON public.customers FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- FINANCE COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.finance_companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  commission_rate DECIMAL(5, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.finance_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access finance_companies" ON public.finance_companies FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- INSURANCE COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.insurance_companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  commission_rate DECIMAL(5, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insurance_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access insurance_companies" ON public.insurance_companies FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  sale_date DATE DEFAULT CURRENT_DATE,
  bike_id UUID REFERENCES public.inventory_bikes(id),
  customer_id UUID REFERENCES public.customers(id),
  sold_by UUID REFERENCES public.employees(id),

  -- Pricing
  selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Payment
  payment_type TEXT NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash', 'finance')),

  -- Finance details (if finance)
  finance_company_id UUID REFERENCES public.finance_companies(id),
  loan_amount DECIMAL(12, 2) DEFAULT 0,
  approved_amount DECIMAL(12, 2) DEFAULT 0,
  finance_commission DECIMAL(12, 2) DEFAULT 0,
  customer_downpayment DECIMAL(12, 2) DEFAULT 0,

  -- Insurance
  insurance_company_id UUID REFERENCES public.insurance_companies(id),
  insurance_amount DECIMAL(12, 2) DEFAULT 0,
  insurance_commission DECIMAL(12, 2) DEFAULT 0,

  -- TVS commission
  tvs_commission DECIMAL(12, 2) DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled', 'pending')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access sales" ON public.sales FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- CR & NUMBER PLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cr_number_plates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  bike_id UUID REFERENCES public.inventory_bikes(id),
  customer_id UUID REFERENCES public.customers(id),

  -- CR
  cr_status TEXT DEFAULT 'pending' CHECK (cr_status IN ('pending', 'received', 'collected')),
  cr_collected_by TEXT,
  cr_nic TEXT,
  cr_signature TEXT,
  cr_collection_date DATE,

  -- Number Plate
  plate_status TEXT DEFAULT 'pending' CHECK (plate_status IN ('pending', 'received', 'collected')),
  plate_number TEXT,
  plate_collected_by TEXT,
  plate_nic TEXT,
  plate_signature TEXT,
  plate_collection_date DATE,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cr_number_plates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access cr_number_plates" ON public.cr_number_plates FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- CHEQUES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cheques (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('tvs', 'other')),
  cheque_number TEXT NOT NULL,
  description TEXT,
  pay_to TEXT,
  issue_date DATE,
  payment_date DATE,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  bank TEXT,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'returned')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access cheques" ON public.cheques FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN (
    'rent', 'utilities', 'salary', 'broker_commission', 'bonus',
    'petty_cash', 'ridermo_payment', 'transport', 'fuel',
    'operating_cost', 'internet_services', 'maintenance_repairs',
    'office_supplies', 'other'
  )),
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  expense_date DATE DEFAULT CURRENT_DATE,
  payment_type TEXT NOT NULL DEFAULT 'cash' CHECK (payment_type IN ('cash', 'card')),
  paid_by UUID REFERENCES public.employees(id),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access expenses" ON public.expenses FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- ATTENDANCE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'sick_leave', 'casual_leave', 'holiday')),
  check_in TIME,
  check_out TIME,
  ot_hours DECIMAL(4, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access attendance" ON public.attendance FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- PAYROLL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payroll (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,

  -- Earnings
  basic_salary DECIMAL(12, 2) DEFAULT 0,
  attendance_bonus DECIMAL(12, 2) DEFAULT 0,
  ot_pay DECIMAL(12, 2) DEFAULT 0,
  bike_commission DECIMAL(12, 2) DEFAULT 0,
  bonus DECIMAL(12, 2) DEFAULT 0,
  gross_salary DECIMAL(12, 2) DEFAULT 0,

  -- Deductions
  epf_employee DECIMAL(12, 2) DEFAULT 0,
  etf DECIMAL(12, 2) DEFAULT 0,
  other_deductions DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,

  net_salary DECIMAL(12, 2) DEFAULT 0,

  -- Working days
  working_days INT DEFAULT 0,
  present_days INT DEFAULT 0,
  absent_days INT DEFAULT 0,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access payroll" ON public.payroll FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- LEAVE MANAGEMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id),
  type TEXT NOT NULL CHECK (type IN ('sick', 'casual', 'annual', 'other')),
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  days INT,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can access leaves" ON public.leaves FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTION: Auto-generate invoice numbers
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1000;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('invoice_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON public.inventory_bikes(status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_cheques_payment_date ON public.cheques(payment_date);
CREATE INDEX IF NOT EXISTS idx_cheques_sale_id ON public.cheques(sale_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cheques_tvs_sale_unique ON public.cheques(sale_id) WHERE type = 'tvs' AND sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cr_plates_status ON public.cr_number_plates(cr_status, plate_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
