-- Fix infinite recursion in enrollment policies

-- First, drop all existing policies on enrollments to avoid conflicts
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

-- Policy 1: Allow users to view their own enrollments
CREATE POLICY "Enable read access for own enrollments"
ON public.enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Allow users to insert their own enrollments
CREATE POLICY "Enable insert for authenticated users"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can only insert their own enrollment
  user_id = auth.uid()
  -- Only one enrollment per user per course
  AND NOT EXISTS (
    SELECT 1 
    FROM public.enrollments e
    WHERE e.course_id = enrollments.course_id
    AND e.user_id = auth.uid()
  )
);

-- Policy 3: Allow users to update their own enrollments
CREATE POLICY "Enable update for own enrollments"
ON public.enrollments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 4: Allow course instructors to view enrollments for their courses
CREATE POLICY "Enable read access for course instructors"
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

-- Policy 5: Allow course instructors to manage enrollments for their courses
CREATE POLICY "Enable all for course instructors"
ON public.enrollments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.courses c
    WHERE c.id = enrollments.course_id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.courses c
    WHERE c.id = enrollments.course_id
    AND c.instructor_id = auth.uid()
  )
);

-- Policy 6: Allow admins full access to enrollments
CREATE POLICY "Enable all for admins"
ON public.enrollments
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
