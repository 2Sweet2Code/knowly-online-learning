export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      course_admins: {
        Row: {
          id: string
          course_id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          reason?: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          user_id: string
          status?: 'pending' | 'approved' | 'rejected'
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          user_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          instructor_id: string
          status: string
          allow_admin_applications: boolean
          created_at: string
          updated_at: string
          // Add other course fields as needed
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: string
          created_at: string
          updated_at: string
          // Add other profile fields as needed
        }
      }
    }
    Views: {
      course_applications_view: {
        Row: {
          id: string
          user_id: string
          course_id: string
          status: 'pending' | 'approved' | 'rejected'
          message: string | null
          created_at: string
          updated_at: string
          user_name: string
          user_email: string
          user_avatar_url: string | null
          course_title: string
          application_type: 'admin' | 'instructor'
        }
      }
    }
  }
}
