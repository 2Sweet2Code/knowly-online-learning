export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  user_metadata?: {
    name?: string;
    role?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  image: string;
  category: 'programim' | 'dizajn' | 'marketing' | 'other';
  instructor: string;
  instructor_id: string;
  instructorId: string;
  instructor_name?: string; // For displaying instructor's full name
  students: number;
  status: 'draft' | 'active' | 'archived';
  price: number;
  isPaid: boolean;
  accessCode?: string;
  allow_admin_applications: boolean;
  created_at: string;
  updated_at: string;
  enrollments?: Array<{
    id: string;
    user_id: string;
    course_id: string;
    status?: string;
    created_at?: string;
    updated_at?: string;
  }>;
}

export interface Enrollment {
  id: string;
  courseId: string;
  userId: string;
  progress: number;
  completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  name: string | null;
  role: 'student' | 'instructor' | 'admin' | null;
  created_at?: string;
  updated_at?: string;
}

export interface CourseAdmin {
  id: string;
  course_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  instructor_id: string;
  created_at: string;
  updated_at?: string;
}
