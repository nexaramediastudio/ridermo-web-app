-- Expense categories: rename oil → fuel, add transport, operating cost, etc.
UPDATE public.expenses SET category = 'fuel' WHERE category = 'oil';

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check
  CHECK (category IN (
    'rent', 'utilities', 'salary', 'broker_commission', 'bonus',
    'petty_cash', 'ridermo_payment', 'transport', 'fuel',
    'operating_cost', 'internet_services', 'maintenance_repairs',
    'office_supplies', 'other'
  ));
