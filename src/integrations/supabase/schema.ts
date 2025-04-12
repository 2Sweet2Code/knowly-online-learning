export type Database = {
  public: {
    Tables: {
      courses: {
        Row: {
          id: string
          title: string
          description: string
          image: string
          category: 'programim' | 'dizajn' | 'marketing' | 'other'
          instructor: string
          instructor_id: string
          students: number
          status: 'active' | 'draft'
          accessCode: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          image: string
          category: 'programim' | 'dizajn' | 'marketing' | 'other'
          instructor: string
          instructor_id: string
          students?: number
          status?: 'active' | 'draft'
          accessCode?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          image?: string
          category?: 'programim' | 'dizajn' | 'marketing' | 'other'
          instructor?: string
          instructor_id?: string
          students?: number
          status?: 'active' | 'draft'
          accessCode?: string
          created_at?: string
          updated_at?: string
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
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          user_id: string
          progress?: number
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          user_id?: string
          progress?: number
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string | null
          role: 'student' | 'instructor' | 'admin' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          role?: 'student' | 'instructor' | 'admin' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          role?: 'student' | 'instructor' | 'admin' | null
          created_at?: string
          updated_at?: string
        }
      }
      course_admins: {
        Row: {
          id: string
          course_id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          reason: string | null
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
    }
  }
}
