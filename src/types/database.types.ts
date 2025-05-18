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
    };
    Views: GeneratedDatabase['public']['Views'];
    Functions: GeneratedDatabase['public']['Functions'];
    Enums: GeneratedDatabase['public']['Enums'];
    CompositeTypes: GeneratedDatabase['public']['CompositeTypes'];
  };
}
