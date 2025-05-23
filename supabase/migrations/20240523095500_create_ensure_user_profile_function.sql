-- Create or replace the ensure_user_profile function
CREATE OR REPLACE FUNCTION public.ensure_user_profile(
  p_user_id uuid,
  p_name text,
  p_email text,
  p_role text DEFAULT 'student'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile jsonb;
  v_user_role text;
BEGIN
  -- First try to get the existing profile
  SELECT to_jsonb(profiles.*) INTO v_profile
  FROM profiles
  WHERE id = p_user_id
  LIMIT 1;

  -- If profile exists, update it
  IF v_profile IS NOT NULL THEN
    UPDATE profiles
    SET 
      name = COALESCE(p_name, name),
      email = COALESCE(p_email, email),
      role = COALESCE(p_role, role, 'student'),
      updated_at = NOW()
    WHERE id = p_user_id
    RETURNING to_jsonb(profiles.*) INTO v_profile;
  ELSE
    -- Otherwise, create a new profile
    INSERT INTO profiles (
      id,
      name,
      email,
      role,
      full_name,
      updated_at
    )
    VALUES (
      p_user_id,
      p_name,
      p_email,
      COALESCE(p_role, 'student'),
      p_name,
      NOW()
    )
    RETURNING to_jsonb(profiles.*) INTO v_profile;
  END IF;

  -- Return the profile
  RETURN jsonb_build_object(
    'success', true,
    'profile', v_profile
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$;
