export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  user_metadata?: {
    name?: string;
    role?: string;
    full_name?: string;
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  image: string;
  category: 'programim' | 'dizajn' | 'marketing' | 'other';
  instructor: string;
  instructor_id: string; // Changed from instructorId to match database
  students: number;
  status: 'active' | 'draft';
  access_code?: string; // Changed from accessCode to match database
  price?: number;
  is_paid?: boolean; // Changed from isPaid to match database
  created_at?: string;
  updated_at?: string;
  allow_admin_applications?: boolean;
  
  // Backward compatibility
  instructorId?: string; // Keep for backward compatibility
  accessCode?: string;   // Keep for backward compatibility
  isPaid?: boolean;      // Keep for backward compatibility
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
