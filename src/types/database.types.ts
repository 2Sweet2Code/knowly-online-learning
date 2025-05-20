export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcement_comments: {
        Row: {
          announcement_id: string
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "course_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "course_announcements_view"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_admins: {
        Row: {
          course_id: string
          created_at: string
          id: string
          reason: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          reason?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_admins_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_announcements: {
        Row: {
          content: string
          course_id: string
          created_at: string | null
          created_by: string
          id: string
          is_pinned: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string | null
          created_by: string
          id?: string
          is_pinned?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          is_pinned?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_comments: {
        Row: {
          content: string
          course_id: string
          created_at: string | null
          id: string
          is_public: boolean | null
          status: string | null
          updated_at: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_comments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_content: {
        Row: {
          content_type: string
          content_url: string | null
          course_id: string
          created_at: string | null
          created_by: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_published: boolean | null
          position: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content_type: string
          content_url?: string | null
          course_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_published?: boolean | null
          position?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content_type?: string
          content_url?: string | null
          course_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_published?: boolean | null
          position?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_content_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_content_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          accessCode: string | null
          allow_admin_applications: boolean | null
          category: string
          created_at: string | null
          description: string
          id: string
          image: string
          instructor: string
          instructor_id: string
          isPaid: boolean | null
          price: number | null
          status: string | null
          students: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          accessCode?: string | null
          allow_admin_applications?: boolean | null
          category: string
          created_at?: string | null
          description: string
          id?: string
          image: string
          instructor: string
          instructor_id: string
          isPaid?: boolean | null
          price?: number | null
          status?: string | null
          students?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          accessCode?: string | null
          allow_admin_applications?: boolean | null
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          image?: string
          instructor?: string
          instructor_id?: string
          isPaid?: boolean | null
          price?: number | null
          status?: string | null
          students?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          completed: boolean | null
          course_id: string
          created_at: string | null
          id: string
          progress: number | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          course_id: string
          created_at?: string | null
          id?: string
          progress?: number | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          course_id?: string
          created_at?: string | null
          id?: string
          progress?: number | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_grades: {
        Row: {
          course_id: string
          created_at: string | null
          feedback: string | null
          grade: number | null
          id: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          feedback?: string | null
          grade?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          feedback?: string | null
          grade?: number | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_grades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      course_announcements_view: {
        Row: {
          content: string | null
          course_id: string | null
          created_at: string | null
          created_by: string | null
          id: string | null
          instructor_avatar: string | null
          instructor_name: string | null
          is_pinned: boolean | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_manage_course: {
        Args: { user_id_to_check: string; course_id_to_check: string }
        Returns: boolean
      }
      check_course_admin: {
        Args: { user_id: string; course_id_param: string }
        Returns: boolean
      }
      get_announcement_comments_with_profiles: {
        Args: { announcement_id: string }
        Returns: {
          id: string
          content: string
          announcement_id: string
          user_id: string
          created_at: string
          updated_at: string
          profiles: Json
        }[]
      }
      get_course_announcements: {
        Args: { course_id_param: string }
        Returns: {
          id: string
          course_id: string
          title: string
          content: string
          is_pinned: boolean
          created_at: string
          updated_at: string
          created_by: string
          instructor_name: string
          instructor_avatar: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
