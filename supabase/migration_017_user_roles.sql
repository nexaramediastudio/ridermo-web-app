-- App roles: worker (showroom) and accountant (finance), plus admin/manager full access
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles SET role = 'worker' WHERE role = 'employee';

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'manager', 'worker', 'accountant'));
