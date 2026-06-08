-- Add Oil expense category
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check
  CHECK (category IN (
    'rent', 'utilities', 'salary', 'broker_commission', 'bonus',
    'petty_cash', 'ridermo_payment', 'oil', 'other'
  ));
