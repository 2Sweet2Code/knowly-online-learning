-- Create a function to count students in a course
CREATE OR REPLACE FUNCTION get_student_count(course_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  student_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO student_count
  FROM enrollments e
  JOIN profiles p ON e.user_id = p.id
  WHERE e.course_id = course_id_param
  AND p.role = 'student';
  
  RETURN COALESCE(student_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a view that includes the student count for each course
CREATE OR REPLACE VIEW courses_with_student_count AS
SELECT 
  c.*,
  get_student_count(c.id) as student_count
FROM courses c;

-- Grant permissions
GRANTANT EXECUTE ON FUNCTION get_student_count TO authenticated, anon;
GRANT SELECT ON courses_with_student_count TO authenticated, anon;
