-- Reliable role read for logged-in user (bypasses RLS)
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'worker'
  FROM auth.users u
  WHERE u.id = auth.uid()
  ON CONFLICT (id) DO NOTHING;

  SELECT jsonb_build_object(
    'id', p.id,
    'role', p.role,
    'full_name', p.full_name,
    'email', p.email
  )
  INTO result
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Re-apply admin for adithya (safe to re-run)
UPDATE public.profiles p
SET role = 'admin', updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND lower(u.email) = lower('adithyaattanayake00@gmail.com');
