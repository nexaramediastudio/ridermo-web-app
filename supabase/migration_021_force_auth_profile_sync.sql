-- Force-create profiles for every Supabase Auth user (run once in SQL Editor)
-- Safe to re-run — only inserts missing rows

INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'worker'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Verify: every auth user should have a profile row
SELECT
  u.email AS auth_email,
  p.email AS profile_email,
  p.role,
  CASE WHEN p.id IS NULL THEN 'MISSING' ELSE 'OK' END AS status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.email;

-- Make your login admin (edit email if needed)
UPDATE public.profiles SET role = 'admin'
WHERE email = 'heshakasasindu5@gmail.com';

-- After this, run migration_020_user_sync_diagnostics.sql if not done yet,
-- then refresh Settings → Users in the app.
