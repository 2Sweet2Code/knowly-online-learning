export interface CourseContent {
  id: string;
  course_id: string;
  title: string;
  description: string;
  content_type: 'file' | 'link' | 'text' | 'assignment';
  content_url?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  position: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseContentPayload {
  course_id: string;
  title: string;
  description: string;
  content_type: 'file' | 'link' | 'text' | 'assignment';
  content_url?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  position?: number;
  is_published?: boolean;
  created_by: string;
}

export interface CreateAssignmentPayload {
  course_id: string;
  title: string;
  description: string;
  due_date: string;
}
