-- Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  -- Drop create policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to create their own profile' AND tablename = 'profiles') THEN
    DROP POLICY "Allow users to create their own profile" ON public.profiles;
  END IF;
  
  -- Drop read policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to read their own profile' AND tablename = 'profiles') THEN
    DROP POLICY "Allow users to read their own profile" ON public.profiles;
  END IF;
  
  -- Drop update policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow users to update their own profile' AND tablename = 'profiles') THEN
    DROP POLICY "Allow users to update their own profile" ON public.profiles;
  END IF;
  
  -- Drop public read policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'profiles') THEN
    DROP POLICY "Enable read access for all users" ON public.profiles;
  END IF;
END $$;

-- Create policy to allow users to create their own profile
CREATE POLICY "Allow users to create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create policy to allow users to read their own profile
CREATE POLICY "Allow users to read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy to allow public read access to profiles (for displaying user info)
-- Only create if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Enable read access for all users' AND tablename = 'profiles') THEN
    CREATE POLICY "Enable read access for all users"
    ON public.profiles
    FOR SELECT
    TO public
    USING (true);
  END IF;
END $$;
