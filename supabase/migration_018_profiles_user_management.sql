-- Sync auth.users → profiles and allow admin/manager user management
-- Run in Supabase SQL Editor

-- 1. Backfill any auth users missing a profile row
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'worker'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 2. Callable sync (run from app before listing users)
CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  WITH ins AS (
    INSERT INTO public.profiles (id, email, full_name, role)
    SELECT
      u.id,
      u.email,
      COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
      'worker'
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO inserted_count FROM ins;
  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_missing_profiles() TO authenticated;

-- 3. RLS: admin + manager can list and update all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins and managers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid() AND me.role IN ('admin', 'manager')
    )
    OR auth.uid() = id
  );

CREATE POLICY "Admins and managers can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid() AND me.role IN ('admin', 'manager')
    )
  );
