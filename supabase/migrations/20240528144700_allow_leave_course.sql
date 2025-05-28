-- Allow users to delete their own enrollments
CREATE POLICY "Allow users to leave courses"
ON public.enrollments
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Create a function to safely leave a course
CREATE OR REPLACE FUNCTION public.leave_course(p_course_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if the user is enrolled in the course
  IF EXISTS (
    SELECT 1 
    FROM public.enrollments 
    WHERE user_id = p_user_id 
    AND course_id = p_course_id
  ) THEN
    -- Delete the enrollment
    DELETE FROM public.enrollments 
    WHERE user_id = p_user_id 
    AND course_id = p_course_id;
    
    -- Clean up related data
    DELETE FROM public.student_grades 
    WHERE user_id = p_user_id 
    AND course_id = p_course_id;
    
    -- Note: Other related data will be handled by cascade deletes if foreign key constraints are set up
  END IF;
  
  -- The function completes successfully even if no rows were affected
  RETURN;
EXCEPTION WHEN OTHERS THEN
  -- Log the error and re-raise
  RAISE WARNING 'Error in leave_course: %', SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
