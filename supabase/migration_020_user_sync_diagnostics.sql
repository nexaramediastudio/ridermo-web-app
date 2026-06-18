-- Fix user list + show sync diagnostics (sync_missing_profiles = 0 is normal when already synced)
-- Run in Supabase SQL Editor

DROP FUNCTION IF EXISTS public.sync_missing_profiles();

CREATE OR REPLACE FUNCTION public.sync_missing_profiles()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  inserted_count integer;
  auth_count integer;
  profile_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO auth_count FROM auth.users;
  SELECT COUNT(*)::integer INTO profile_count FROM public.profiles;

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

  RETURN jsonb_build_object(
    'inserted', inserted_count,
    'auth_users', auth_count,
    'profiles', profile_count + inserted_count,
    'message', CASE
      WHEN inserted_count = 0 THEN 'Already in sync — 0 new profiles added'
      ELSE inserted_count || ' new profile(s) created from Auth'
    END
  );
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  PERFORM public.sync_missing_profiles();

  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.role, p.created_at
  FROM public.profiles p
  ORDER BY p.full_name NULLS LAST, p.email NULLS LAST;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_sync_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  auth_count integer;
  profile_count integer;
  auth_emails jsonb;
  profile_emails jsonb;
BEGIN
  SELECT COUNT(*)::integer INTO auth_count FROM auth.users;
  SELECT COUNT(*)::integer INTO profile_count FROM public.profiles;

  SELECT COALESCE(jsonb_agg(u.email ORDER BY u.email), '[]'::jsonb)
  INTO auth_emails
  FROM auth.users u;

  SELECT COALESCE(jsonb_agg(p.email ORDER BY p.email), '[]'::jsonb)
  INTO profile_emails
  FROM public.profiles p;

  RETURN jsonb_build_object(
    'auth_users', auth_count,
    'profiles', profile_count,
    'in_sync', auth_count = profile_count,
    'auth_emails', auth_emails,
    'profile_emails', profile_emails
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_missing_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_system_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sync_status() TO authenticated;

-- Ensure at least one admin exists
UPDATE public.profiles SET role = 'admin'
WHERE id = (
  SELECT p.id FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY u.created_at ASC
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin');
