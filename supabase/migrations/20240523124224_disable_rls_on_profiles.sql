-- Disable Row Level Security on the profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on the profiles table
DO $$
BEGIN
  -- Drop create policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow users to create their own profile') THEN
    DROP POLICY "Allow users to create their own profile" ON public.profiles;
  END IF;
  
  -- Drop read policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow users to read their own profile') THEN
    DROP POLICY "Allow users to read their own profile" ON public.profiles;
  END IF;
  
  -- Drop update policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow users to update their own profile') THEN
    DROP POLICY "Allow users to update their own profile" ON public.profiles;
  END IF;
  
  -- Drop public read policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Enable read access for all users') THEN
    DROP POLICY "Enable read access for all users" ON public.profiles;
  END IF;
END $$;
