-- Create announcement_comments table
CREATE TABLE IF NOT EXISTS public.announcement_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID NOT NULL REFERENCES public.course_announcements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on announcement_comments
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for announcement_comments
CREATE POLICY "Enable read access for authenticated users"
ON public.announcement_comments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.announcement_comments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own comments"
ON public.announcement_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.announcement_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_announcement_comments_announcement_id 
ON public.announcement_comments(announcement_id);

-- Create index for user_id
CREATE INDEX IF NOT EXISTS idx_announcement_comments_user_id 
ON public.announcement_comments(user_id);
