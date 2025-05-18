-- Create a function to check if a user is a course admin
create or replace function check_course_admin(user_id uuid, course_id_param uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 
    from course_admins 
    where course_admins.user_id = check_course_admin.user_id
      and course_admins.course_id = check_course_admin.course_id_param
      and course_admins.status = 'approved'
  );
$$;
