-- Force admin for adithyaattanayake00@gmail.com (matches auth.users id)
-- Run in Supabase SQL Editor

INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'admin'
FROM auth.users u
WHERE lower(u.email) = lower('adithyaattanayake00@gmail.com')
ON CONFLICT (id) DO UPDATE
SET role = 'admin', email = EXCLUDED.email, updated_at = NOW();

UPDATE public.profiles p
SET role = 'admin', updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = lower('adithyaattanayake00@gmail.com');

-- Confirm
SELECT u.id, u.email AS auth_email, p.email AS profile_email, p.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) LIKE '%adithyaattanayake%';
