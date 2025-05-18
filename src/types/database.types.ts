import { Database as GeneratedDatabase } from '@/integrations/supabase/types';

export type CourseComment = {
  id: string;
  user_id: string;
  user_name?: string;
  course_id: string;
  content: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string | null;
};

export type CourseContent = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  content_type: 'file' | 'link' | 'text' | 'video' | 'assignment';
  content_url: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export type CourseAnnouncement = {
  id: string;
  course_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export type AnnouncementComment = {
  id: string;
  announcement_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
  } | null;
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

export interface Database extends GeneratedDatabase {
  public: {
    Tables: GeneratedDatabase['public']['Tables'] & {
      course_comments: {
        Row: CourseComment;
        Insert: Omit<CourseComment, 'id' | 'updated_at'>;
        Update: Partial<Omit<CourseComment, 'id' | 'created_at' | 'user_id' | 'course_id'>> & {
          id?: string;
          updated_at?: string | null;
        };
      };
      course_content: {
        Row: CourseContent;
        Insert: Omit<CourseContent, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CourseContent, 'id' | 'created_at' | 'course_id' | 'created_by'>> & {
          id?: string;
          updated_at?: string;
        };
      };
      course_announcements: {
        Row: CourseAnnouncement;
        Insert: Omit<CourseAnnouncement, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CourseAnnouncement, 'id' | 'created_at' | 'course_id' | 'created_by'>> & {
          id?: string;
          updated_at?: string;
        };
      };
      announcement_comments: {
        Row: AnnouncementComment;
        Insert: Omit<AnnouncementComment, 'id' | 'created_at' | 'updated_at' | 'profiles'>;
        Update: Partial<Omit<AnnouncementComment, 'id' | 'created_at' | 'announcement_id' | 'user_id'>> & {
          id?: string;
          updated_at?: string;
        };
      };
    };
    Views: GeneratedDatabase['public']['Views'];
    Functions: GeneratedDatabase['public']['Functions'] & {
      // Add any custom functions here
    };
    Enums: GeneratedDatabase['public']['Enums'] & {
      content_type: 'file' | 'link' | 'text' | 'video' | 'assignment';
      user_role: 'student' | 'instructor' | 'admin';
    };
    CompositeTypes: GeneratedDatabase['public']['CompositeTypes'];
  };
}

// Extend the Window interface to include ENV variables
declare global {
  interface Window {
    ENV: {
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    };
  }
}
