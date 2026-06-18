-- Reliable user list: sync auth.users → profiles and return all users (bypasses RLS)
-- Run in Supabase SQL Editor (after migration_018 if not run yet)

-- Backfill any auth users still missing profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'worker'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

  UPDATE public.profiles p
  SET
    email = u.email,
    full_name = COALESCE(
      NULLIF(TRIM(p.full_name), ''),
      u.raw_user_meta_data->>'full_name',
      split_part(u.email, '@', 1)
    )
  FROM auth.users u
  WHERE p.id = u.id;

  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_system_users()
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  role text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_role text;
  profile_count integer;
BEGIN
  SELECT p.role INTO caller_role FROM public.profiles p WHERE p.id = auth.uid();
  SELECT COUNT(*)::integer INTO profile_count FROM public.profiles;

  -- Admin/manager, or sole account (first-time setup)
  IF caller_role NOT IN ('admin', 'manager')
     AND NOT (profile_count <= 1 AND auth.uid() IS NOT NULL) THEN
    RAISE EXCEPTION 'Only admin or manager can list users';
  END IF;

  PERFORM public.sync_missing_profiles();

  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.role, p.created_at
  FROM public.profiles p
  ORDER BY p.full_name NULLS LAST, p.email NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_role(target_id uuid, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  profile_count integer;
BEGIN
  IF new_role NOT IN ('admin', 'manager', 'worker', 'accountant') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  SELECT p.role INTO caller_role FROM public.profiles p WHERE p.id = auth.uid();
  SELECT COUNT(*)::integer INTO profile_count FROM public.profiles;

  IF caller_role NOT IN ('admin', 'manager')
     AND NOT (profile_count <= 1 AND target_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only admin or manager can change roles';
  END IF;

  UPDATE public.profiles SET role = new_role, updated_at = NOW() WHERE id = target_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_missing_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_system_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;

-- Promote your login to admin (edit the email if needed)
UPDATE public.profiles SET role = 'admin'
WHERE email = (SELECT email FROM auth.users ORDER BY created_at ASC LIMIT 1);
