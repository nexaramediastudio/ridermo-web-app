-- Expense payment type: cash or card
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'cash';

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_payment_type_check;

ALTER TABLE public.expenses ADD CONSTRAINT expenses_payment_type_check
  CHECK (payment_type IN ('cash', 'card'));
