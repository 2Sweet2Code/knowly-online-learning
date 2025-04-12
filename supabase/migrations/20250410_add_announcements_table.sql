-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policy for instructors to create announcements
CREATE POLICY "Instructors can create announcements"
ON announcements FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = instructor_id AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND (raw_user_meta_data->>'role' = 'instructor' OR raw_user_meta_data->>'role' = 'admin')
  )
);

-- Policy for everyone to view announcements
CREATE POLICY "Anyone can view announcements"
ON announcements FOR SELECT
TO authenticated
USING (true);

-- Policy for instructors to update their own announcements
CREATE POLICY "Instructors can update their own announcements"
ON announcements FOR UPDATE
TO authenticated
USING (auth.uid() = instructor_id)
WITH CHECK (auth.uid() = instructor_id);

-- Policy for instructors to delete their own announcements
CREATE POLICY "Instructors can delete their own announcements"
ON announcements FOR DELETE
TO authenticated
USING (auth.uid() = instructor_id);
