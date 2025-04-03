

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  image: string;
  category: 'programim' | 'dizajn' | 'marketing' | 'other';
  instructor: string;
  instructorId: string;
  students: number;
  status: 'active' | 'draft';
  created_at?: string;
  updated_at?: string;
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
