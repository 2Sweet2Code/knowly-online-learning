-- Enable RLS on student_grades table if it's not already enabled
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;

-- Function to check if user is the instructor of a course
CREATE OR REPLACE FUNCTION public.is_course_instructor(course_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.courses 
    WHERE id = course_id AND instructor_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow instructors to view all grades for their courses
CREATE POLICY "Instructors can view grades for their courses" 
ON public.student_grades
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = student_grades.course_id
    AND c.instructor_id = auth.uid()
  )
);

-- Allow instructors to insert/update grades for their courses
CREATE POLICY "Instructors can manage grades for their courses" 
ON public.student_grades
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = student_grades.course_id
    AND c.instructor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = student_grades.course_id
    AND c.instructor_id = auth.uid()
  )
);

-- Allow students to view their own grades
CREATE POLICY "Students can view their own grades" 
ON public.student_grades
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow system to insert grades (for automated grading)
CREATE POLICY "Enable insert for service role"
ON public.student_grades
FOR INSERT
TO service_role
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON public.student_grades TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.student_grades TO authenticated;

-- Add a trigger to update timestamps if not exists
CREATE OR REPLACE FUNCTION public.update_student_grades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'update_student_grades_updated_at'
  ) THEN
    CREATE TRIGGER update_student_grades_updated_at
    BEFORE UPDATE ON public.student_grades
    FOR EACH ROW EXECUTE FUNCTION public.update_student_grades_updated_at();
  END IF;
END $$;
