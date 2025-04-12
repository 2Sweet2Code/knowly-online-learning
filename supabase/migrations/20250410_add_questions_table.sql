-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Policy for students to create questions
CREATE POLICY "Students can create questions"
ON questions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = student_id
);

-- Policy for students to view their own questions
CREATE POLICY "Students can view their own questions"
ON questions FOR SELECT
TO authenticated
USING (
  auth.uid() = student_id
);

-- Policy for instructors to view questions for their courses
CREATE POLICY "Instructors can view questions for their courses"
ON questions FOR SELECT
TO authenticated
USING (
  auth.uid() = instructor_id
);

-- Policy for instructors to update questions for their courses
CREATE POLICY "Instructors can update questions for their courses"
ON questions FOR UPDATE
TO authenticated
USING (
  auth.uid() = instructor_id
)
WITH CHECK (
  auth.uid() = instructor_id
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_student_id ON questions(student_id);
CREATE INDEX IF NOT EXISTS idx_questions_instructor_id ON questions(instructor_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
