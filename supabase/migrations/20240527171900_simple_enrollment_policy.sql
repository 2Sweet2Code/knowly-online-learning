-- Create a function to check for existing enrollments without causing recursion
CREATE OR REPLACE FUNCTION public.can_enroll_user(user_id uuid, course_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 
    FROM public.enrollments e
    WHERE e.course_id = can_enroll_user.course_id
    AND e.user_id = can_enroll_user.user_id
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Drop all existing policies on enrollments
DO $$
BEGIN
  -- Drop all policies on enrollments table
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.enrollments;', ' ')
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'enrollments'
  );
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if there are no policies to drop
  RAISE NOTICE 'No policies to drop or error dropping policies: %', SQLERRM;
END
$$;

-- Simple policy to allow users to enroll in courses
CREATE POLICY "Allow user enrollment"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND public.can_enroll_user(auth.uid(), course_id)
);

-- Allow users to view their own enrollments
CREATE POLICY "View own enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow instructors to view enrollments for their courses
CREATE POLICY "View course enrollments for instructors"
ON public.enrollments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.courses c
    WHERE c.id = enrollments.course_id
    AND c.instructor_id = auth.uid()
  )
);

-- Allow admins full access
CREATE POLICY "Full access for admins"
ON public.enrollments
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
