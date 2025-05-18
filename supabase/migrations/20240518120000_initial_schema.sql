-- Enable Row Level Security
ALTER TABLE IF EXISTS public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.course_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to active courses
CREATE POLICY "Enable read access for all users" ON public.courses
    FOR SELECT
    USING (status = 'active');

-- Create policy to allow instructors to manage their courses
CREATE POLICY "Enable all access for instructors" ON public.courses
    FOR ALL
    USING (auth.uid() = instructor_id);

-- Create policy to allow admins to manage all courses
CREATE POLICY "Enable all access for admins" ON public.courses
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Create policy to allow read access to course announcements
CREATE POLICY "Enable read access to course announcements" ON public.course_announcements
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = course_announcements.course_id
        AND courses.status = 'active'
    ));

-- Create policy to allow instructors to manage their course announcements
CREATE POLICY "Enable all access for course instructors" ON public.course_announcements
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = course_announcements.course_id
        AND courses.instructor_id = auth.uid()
    ));

-- Create policy to allow admins to manage all course announcements
CREATE POLICY "Enable all access for admins on announcements" ON public.course_announcements
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    ));

-- Create policy to allow users to see their own enrollments
CREATE POLICY "Enable read access to own enrollments" ON public.enrollments
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create policy to allow users to enroll in courses
CREATE POLICY "Enable insert for authenticated users" ON public.enrollments
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow instructors to see enrollments for their courses
CREATE POLICY "Enable read access for course instructors" ON public.enrollments
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.courses
        WHERE courses.id = enrollments.course_id
        AND courses.instructor_id = auth.uid()
    ));
