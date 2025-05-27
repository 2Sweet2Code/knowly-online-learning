-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user is the instructor of a course
CREATE OR REPLACE FUNCTION public.is_course_instructor(course_id uuid, user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.courses
    WHERE id = course_id AND instructor_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if admin applications are allowed for a course
CREATE OR REPLACE FUNCTION public.are_admin_applications_allowed(course_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT allow_admin_applications 
    FROM public.courses 
    WHERE id = course_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for profiles table
-- Allow users to view all profiles
CREATE POLICY "Enable read access for all users" 
ON public.profiles 
FOR SELECT 
TO authenticated, anon
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Enable update for users based on id" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

-- Policies for courses table
-- Allow public to view published courses
CREATE POLICY "Enable read access for published courses" 
ON public.courses 
FOR SELECT 
TO authenticated, anon
USING (status = 'published');

-- Allow instructors to manage their own courses
CREATE POLICY "Enable all access for course instructors" 
ON public.courses 
FOR ALL 
TO authenticated
USING (instructor_id = auth.uid())
WITH CHECK (instructor_id = auth.uid());

-- Allow admins to manage all courses
CREATE POLICY "Enable all access for admins" 
ON public.courses 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Policies for course_admins table
-- Allow users to view their own applications
CREATE POLICY "Enable read access for own applications" 
ON public.course_admins 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Allow instructors to view applications for their courses
CREATE POLICY "Enable read access for course instructors" 
ON public.course_admins 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.courses 
  WHERE id = course_admins.course_id 
  AND instructor_id = auth.uid()
));

-- Allow admins to view all applications
CREATE POLICY "Enable read access for admins" 
ON public.course_admins 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow admins to apply for courses that allow applications
CREATE POLICY "Enable insert for admin applications" 
ON public.course_admins 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.is_admin(auth.uid()) AND 
  public.are_admin_applications_allowed(course_id) AND
  NOT EXISTS (
    SELECT 1 FROM public.course_admins 
    WHERE course_id = course_admins.course_id 
    AND user_id = auth.uid()
  )
);

-- Allow course instructors to update application status
CREATE POLICY "Enable update for course instructors" 
ON public.course_admins 
FOR UPDATE 
TO authenticated
USING (public.is_course_instructor(course_id, auth.uid()))
WITH CHECK (public.is_course_instructor(course_id, auth.uid()));

-- Allow users to delete their own pending applications
CREATE POLICY "Enable delete for own pending applications" 
ON public.course_admins 
FOR DELETE 
TO authenticated
USING (
  user_id = auth.uid() AND 
  status = 'pending'
);

-- Policies for enrollments table
-- Allow users to view their own enrollments
CREATE POLICY "Enable read access for own enrollments" 
ON public.enrollments 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Allow course instructors to view enrollments for their courses
CREATE POLICY "Enable read access for course instructors on enrollments" 
ON public.enrollments 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.courses 
  WHERE id = enrollments.course_id 
  AND instructor_id = auth.uid()
));

-- Allow admins to manage all enrollments
CREATE POLICY "Enable all access for admins on enrollments" 
ON public.enrollments 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Allow course instructors to manage enrollments for their courses
CREATE POLICY "Enable insert/update for course instructors on enrollments" 
ON public.enrollments 
FOR INSERT 
TO authenticated
WITH CHECK (public.is_course_instructor(course_id, auth.uid()));

-- Create trigger function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_admins_updated_at
BEFORE UPDATE ON public.course_admins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
