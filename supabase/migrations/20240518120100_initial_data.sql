-- Enable necessary extensions
create extension if not exists "uuid-ossp" with schema extensions;

-- Create enum types
create type public.course_status as enum ('draft', 'active', 'archived');
create type public.content_type as enum ('file', 'link', 'text', 'video', 'assignment');
create type public.user_role as enum ('student', 'instructor', 'admin');

-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  role user_role default 'student'::user_role not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

-- Create courses table
create table public.courses (
  id uuid default uuid_generate_v4() not null primary key,
  title text not null,
  description text,
  image text,
  category text not null,
  instructor_id uuid references public.profiles(id) not null,
  status course_status default 'draft'::course_status not null,
  price numeric(10, 2) default 0,
  is_paid boolean default false,
  access_code text,
  allow_admin_applications boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.courses enable row level security;

-- Create course_announcements table
create table public.course_announcements (
  id uuid default uuid_generate_v4() not null primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  content text not null,
  is_pinned boolean default false,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.course_announcements enable row level security;

-- Create enrollments table
create table public.enrollments (
  id uuid default uuid_generate_v4() not null primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  progress double precision default 0 not null,
  completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, course_id)
);

alter table public.enrollments enable row level security;

-- Create indexes
create index if not exists courses_instructor_id_idx on public.courses (instructor_id);
create index if not exists course_announcements_course_id_idx on public.course_announcements (course_id);
create index if not exists enrollments_user_id_idx on public.enrollments (user_id);
create index if not exists enrollments_course_id_idx on public.enrollments (course_id);

-- Create a function to handle new user signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    'student'::user_role
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to handle new user signups
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a function to get the current user's role
create or replace function public.get_user_role()
returns user_role as $$
  select role from public.profiles where id = auth.uid();
$$ language sql security definer;

-- Create a function to check if a user is an admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Create a function to check if a user is an instructor
create or replace function public.is_instructor()
returns boolean as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'instructor'
  );
$$ language sql security definer;

-- Create a function to check if a user is enrolled in a course
create or replace function public.is_enrolled(course_id_param uuid)
returns boolean as $$
  select exists (
    select 1 from public.enrollments 
    where user_id = auth.uid() and course_id = course_id_param
  );
$$ language sql security definer;

-- Create a function to check if a user is the instructor of a course
create or replace function public.is_course_instructor(course_id_param uuid)
returns boolean as $$
  select exists (
    select 1 from public.courses 
    where id = course_id_param and instructor_id = auth.uid()
  );
$$ language sql security definer;
