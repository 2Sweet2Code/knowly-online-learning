-- Fix RLS policies for announcements, announcement comments, and grades

-- 1. Fix announcements policies
-- First drop existing policies if they exist
DO $$
BEGIN
  -- Drop policies on announcements
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcements') THEN
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.announcements;
    DROP POLICY IF EXISTS "Enable all for announcement authors" ON public.announcements;
    
    -- Allow public to view announcements
    CREATE POLICY "Enable read access for all users"
    ON public.announcements
    FOR SELECT
    TO authenticated, anon
    USING (true);

    -- Allow instructors to manage their announcements
    CREATE POLICY "Enable all for announcement authors"
    ON public.announcements
    FOR ALL
    TO authenticated
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());
  END IF;
END $$;

-- 2. Fix announcement comments policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'announcement_comments') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.announcement_comments;
    DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.announcement_comments;
    DROP POLICY IF EXISTS "Enable update for comment authors" ON public.announcement_comments;
    
    -- Allow authenticated users to view comments
    CREATE POLICY "Enable read access for authenticated users"
    ON public.announcement_comments
    FOR SELECT
    TO authenticated
    USING (true);

    -- Allow users to create comments
    CREATE POLICY "Enable insert for authenticated users"
    ON public.announcement_comments
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

    -- Allow users to update their own comments
    CREATE POLICY "Enable update for comment authors"
    ON public.announcement_comments
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 3. Fix grades policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_grades') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Enable read access for grade owners" ON public.student_grades;
    DROP POLICY IF EXISTS "Enable all for course instructors on grades" ON public.student_grades;
    
    -- Allow students to view their own grades
    CREATE POLICY "Enable read access for grade owners"
    ON public.student_grades
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

    -- Allow instructors to view and manage grades for their courses
    CREATE POLICY "Enable all for course instructors on grades"
    ON public.student_grades
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 
        FROM public.courses c
        WHERE c.id = student_grades.course_id
        AND c.instructor_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 
        FROM public.courses c
        WHERE c.id = student_grades.course_id
        AND c.instructor_id = auth.uid()
      )
    );
  END IF;
END $$;

-- 4. Simplified course access policies to prevent recursion
DO $$
BEGIN
  -- Drop existing policies first
  DROP POLICY IF EXISTS "Enable read access for published courses" ON public.courses;
  DROP POLICY IF EXISTS "Enable read access for enrolled users" ON public.courses;
  
  -- Simple policy: Allow public to view published courses
  -- This avoids any potential recursion by not checking enrollments
  CREATE POLICY "Enable read access for published courses"
  ON public.courses
  FOR SELECT
  TO authenticated, anon
  USING (status = 'published');

  -- Allow instructors to manage their courses
  CREATE POLICY "Enable all for course instructors"
  ON public.courses
  FOR ALL
  TO authenticated
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());
  
  -- Allow admins to manage all courses
  CREATE POLICY "Enable all for admins"
  ON public.courses
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
END $$;
