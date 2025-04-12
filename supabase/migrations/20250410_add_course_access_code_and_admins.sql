-- Add accessCode column to courses table
ALTER TABLE "public"."courses" ADD COLUMN IF NOT EXISTS "accessCode" TEXT;

-- Create course_admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS "public"."course_admins" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "course_id" UUID NOT NULL REFERENCES "public"."courses"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS "course_admins_course_id_idx" ON "public"."course_admins"("course_id");
CREATE INDEX IF NOT EXISTS "course_admins_user_id_idx" ON "public"."course_admins"("user_id");
CREATE INDEX IF NOT EXISTS "course_admins_status_idx" ON "public"."course_admins"("status");

-- Add a unique constraint to prevent duplicate admin requests
CREATE UNIQUE INDEX IF NOT EXISTS "course_admins_course_user_unique_idx" 
ON "public"."course_admins"("course_id", "user_id");
