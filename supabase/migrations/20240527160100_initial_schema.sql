-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'student'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_email_key UNIQUE (email),
  CONSTRAINT profiles_role_check CHECK (role IN ('student', 'instructor', 'admin'))
);

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  instructor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'::text,
  allow_admin_applications boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

-- Create course_admins table
CREATE TABLE IF NOT EXISTS public.course_admins (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'::text,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_admins_pkey PRIMARY KEY (id),
  CONSTRAINT course_admins_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT course_admins_course_id_user_id_key UNIQUE (course_id, user_id)
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollments_role_check CHECK (role IN ('student', 'ta', 'instructor')),
  CONSTRAINT enrollments_course_id_user_id_key UNIQUE (course_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON public.courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_admins_course_id ON public.course_admins(course_id);
CREATE INDEX IF NOT EXISTS idx_course_admins_user_id ON public.course_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON public.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON public.enrollments(user_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
