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
      announcements: {
        Row: {
          id: string
          title: string
          content: string
          instructor_id: string
          instructor_name: string
          created_at: string
          updated_at: string | null
          course_id: string
        }
      }
      assignments: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          due_date: string | null
          created_at: string
          updated_at: string | null
        }
      }
      course_admins: {
        Row: {
          id: string
          course_id: string
          user_id: string
          created_at: string
          updated_at: string | null
          status: string
          reason: string | null
        }
      }
      course_announcements: {
        Row: {
          id: string
          course_id: string
          title: string
          content: string
          is_pinned: boolean
          created_at: string
          updated_at: string | null
          created_by: string
        }
      }
      course_comments: {
        Row: {
          id: string
          course_id: string
          user_id: string
          content: string
          is_public: boolean
          created_at: string
          updated_at: string | null
          user_name: string
          status: string
        }
      }
      course_content: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          content_type: string
          content_url: string | null
          file_path: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          position: number
          is_published: boolean
          created_at: string
          updated_at: string | null
          created_by: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          image: string | null
          category: string | null
          instructor: string | null
          instructor_id: string
          students: number | null
          status: string
          created_at: string
          updated_at: string | null
          price: number | null
          isPaid: boolean | null
          accessCode: string | null
          allow_admin_applications: boolean | null
        }
      }
      enrollments: {
        Row: {
          id: string
          course_id: string
          user_id: string
          progress: number
          completed: boolean
          created_at: string
          updated_at: string | null
          role: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          name: string | null
          role: string
          created_at: string
          updated_at: string | null
        }
      }

      student_grades: {
        Row: {
          id: string
          course_id: string
          user_id: string
          grade: number | null
          feedback: string | null
          updated_by: string
          created_at: string
          updated_at: string | null
        }
      }
      announcement_comments: {
        Row: {
          id: string
          announcement_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string | null
        }
      }
    }
  }
}