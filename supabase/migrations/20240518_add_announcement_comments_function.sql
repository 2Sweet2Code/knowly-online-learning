-- Create a function to get announcement comments with profiles
create or replace function get_announcement_comments_with_profiles(announcement_id uuid)
returns table (
  id uuid,
  content text,
  announcement_id uuid,
  user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  profiles jsonb
) 
language sql 
security definer
as $$
  select 
    ac.id,
    ac.content,
    ac.announcement_id,
    ac.user_id,
    ac.created_at,
    ac.updated_at,
    jsonb_build_object(
      'name', p.name,
      'avatar_url', p.avatar_url
    ) as profiles
  from 
    announcement_comments ac
    left join profiles p on ac.user_id = p.id
  where 
    ac.announcement_id = get_announcement_comments_with_profiles.announcement_id
  order by 
    ac.created_at asc;
$$;
