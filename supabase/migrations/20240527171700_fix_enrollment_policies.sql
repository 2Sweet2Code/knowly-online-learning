-- Fix enrollment policies to allow users to enroll in courses

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable insert/update for course instructors on enrollments" ON public.enrollments;

-- Allow users to enroll themselves in courses
CREATE POLICY "Enable insert for authenticated users to enroll"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can only enroll themselves
  user_id = auth.uid()
  -- Only allow one enrollment per user per course
  AND NOT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = enrollments.course_id
    AND e.user_id = auth.uid()
  )
);

-- Allow users to update their own enrollments (e.g., to update progress)
CREATE POLICY "Enable update for own enrollments"
ON public.enrollments
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Keep the existing read policies
-- Allow users to view their own enrollments
-- Allow instructors to view enrollments for their courses
-- Allow admins to view all enrollments

-- Allow course instructors to manage enrollments for their courses
CREATE POLICY "Enable all for course instructors on enrollments"
ON public.enrollments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = enrollments.course_id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = enrollments.course_id
    AND c.instructor_id = auth.uid()
  )
);

-- Keep the admin policy that allows full access to admins
-- This should already exist in your policies
