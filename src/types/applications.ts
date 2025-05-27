import { Database } from './database.types';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface BaseApplication {
  id: string;
  user_id: string;
  course_id: string;
  status: ApplicationStatus;
  message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminApplication extends BaseApplication {
  type: 'admin';
}

export interface InstructorApplication extends BaseApplication {
  type: 'instructor';
}

export type Application = AdminApplication | InstructorApplication;

export interface ApplicationWithDetails extends BaseApplication {
  type: 'admin' | 'instructor';
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  course: {
    id: string;
    title: string;
  };
}

// Types for creating new applications
export interface CreateApplicationInput {
  course_id: string;
  message?: string;
}

// Types for updating application status
export interface UpdateApplicationStatusInput {
  status: ApplicationStatus;
  reason?: string;
}

// Types for the view
export type ApplicationView = Database['public']['Views']['course_applications_view']['Row'] & {
  application_type: 'admin' | 'instructor';
};

// Type guards
export function isAdminApplication(
  application: Application
): application is AdminApplication {
  return application.type === 'admin';
}

export function isInstructorApplication(
  application: Application
): application is InstructorApplication {
  return application.type === 'instructor';
}
