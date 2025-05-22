import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Lock, Mail, User as UserIcon } from 'lucide-react';
import { Course } from '@/types';

interface CoursePreviewProps {
  course: Course;
  onEnrollClick: () => void;
  isAuthenticated: boolean;
  isEnrolling: boolean;
}

export const CoursePreview: React.FC<CoursePreviewProps> = ({
  course,
  onEnrollClick,
  isAuthenticated,
  isEnrolling,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 mb-4">
          <Lock className="h-8 w-8 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Preview</h2>
        
        <p className="text-gray-600 mb-6">
          You need to enroll in this course to access its content.
        </p>
        
        {course.preview_content ? (
          <div className="prose max-w-none mb-8 text-left">
            <h3 className="text-lg font-medium text-gray-900 mb-4">About This Course</h3>
            <div 
              className="prose prose-sm text-gray-600" 
              dangerouslySetInnerHTML={{ __html: course.preview_content }}
            />
          </div>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  No preview content available for this course.
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="mt-8">
          {!isAuthenticated ? (
            <div className="space-y-4">
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                Sign in to Enroll
              </Button>
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
              </p>
            </div>
          ) : (
            <Button 
              onClick={onEnrollClick}
              disabled={isEnrolling}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {isEnrolling ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Enroll in Course
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoursePreview;
