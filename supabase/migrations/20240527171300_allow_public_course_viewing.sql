-- Allow public (unauthenticated) users to view all courses
-- This will make courses visible to everyone without requiring authentication

-- Update the existing policy to allow public access
DROP POLICY IF EXISTS "Enable read access for published courses" ON public.courses;

-- Create a new policy that allows anyone to view all courses
CREATE POLICY "Enable public read access to all courses" 
ON public.courses 
FOR SELECT 
USING (true);

-- Keep the existing policies for instructors and admins to manage courses
-- These ensure only authorized users can modify course data

-- Note: The existing policies for instructors and admins will remain in place
-- to control who can create, update, or delete courses.
