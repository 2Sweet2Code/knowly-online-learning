import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CourseContentViewer } from "@/components/course/CourseContentViewer";
import { Loader2, MessageSquare, User, Clock, Users, AlertCircle, Home, GraduationCap, Bell, AlertTriangle, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";
import type { PostgrestError } from '@supabase/postgrest-js';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Course } from "@/types";
import type { Database } from '@/types/database.types';
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ClassmatesList } from "../components/ClassmatesList";
import { StudentGradesList } from "../components/StudentGradesList";
import { AnnouncementModal } from "../components/dashboard/AnnouncementModal";

interface CourseAdmin {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mt-3 text-lg font-medium text-gray-900">
              Something went wrong
            </h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>We apologize for the inconvenience. An error occurred while loading this page.</p>
              {this.state.error && (
                <details className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto max-h-32">
                  <summary className="cursor-pointer font-medium">Error details</summary>
                  <pre className="mt-1 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-brown px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brown-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brown"
                onClick={this.handleReset}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface Announcement {
  id: string;
  course_id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at?: string;
  created_by: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
  full_name: string;
  avatar_url: string | null;
}

interface CourseDetailPageProps {
  initialCourseData?: Course | null;
}

const CourseDetailPageContent: React.FC<CourseDetailPageProps> = ({ initialCourseData = null }) => {
  // Navigation and routing
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  // Hooks and context
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // UI state
  const [tab, setTab] = useState<'stream' | 'content' | 'students' | 'grades' | 'settings'>('stream');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Course enrollment state
  const [accessCode, setAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  // Course data
  const [course, setCourse] = useState<Course | null>(null);
  const [isInstructor, setIsInstructor] = useState(false);
  const [isClassAdmin, setIsClassAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  
  // Extract course code from title
  const codeMatch = course?.title?.match(/\[(.*?)\]/);
  const courseCode = codeMatch ? codeMatch[1] : null;
  const cleanTitle = course?.title?.replace(/\s*\[.*?\]\s*/, '') ?? '';

  // Fetch course data
  const { data: courseData, isLoading: isLoadingCourse } = useQuery<Course>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
          
        if (error) throw error;
        return data as Course;
      } catch (error) {
        console.error('Error fetching course:', error);
        setError('Failed to load course data');
        return null;
      }
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update course state
  useEffect(() => {
    if (courseData) {
      setCourse(courseData);
    }
  }, [courseData]);

  // Check enrollment and instructor status
  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user?.id || !courseId) return;

      try {
        // Check if user is the instructor of this course
        const { data: instructorData, error: instructorError } = await supabase
          .from('courses')
          .select('instructor_id')
          .eq('id', courseId)
          .single();

        if (instructorError) throw instructorError;

        // If user is the instructor, set as enrolled and instructor
        if (instructorData?.instructor_id === user.id) {
          setIsEnrolled(true);
          setIsInstructor(true);
          return;
        }

        // Check if user is enrolled
        const { data, error } = await supabase
          .from('course_enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        if (error) throw error;

        setIsEnrolled(!!data);
      } catch (error) {
        console.error('Error checking enrollment:', error);
        setError('Failed to check course enrollment status');
      }
    };

    checkEnrollment();
  }, [user, courseId]);

  const handleEnroll = async () => {
    if (!user?.id || !courseId) {
      setError('You must be logged in to enroll in a course');
      return;
    }

    // Prevent double enrollment
    if (isEnrolled) {
      toast({
        title: 'Already Enrolled',
        description: 'You are already enrolled in this course.',
      });
      return;
    }

    // Prevent instructors from enrolling in their own course
    if (isInstructor) {
      toast({
        title: 'Instructor Access',
        description: 'You are the instructor of this course and do not need to enroll.',
        variant: 'default',
      });
      return;
    }

    setIsEnrolling(true);
    
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          status: 'enrolled',
          enrolled_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setIsEnrolled(true);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['course', courseId, 'enrollments'] 
      });
      
      toast({
        title: 'Enrollment Successful',
        description: 'You have successfully enrolled in the course.',
      });
      
      // Refresh the page to update the UI
      window.location.reload();
      
    } catch (error) {
      console.error('Error enrolling in course:', error);
      
      let errorMessage = 'Failed to enroll in course. Please try again.';
      
      // Check for specific error codes
      const pgError = error as PostgrestError;
      if (pgError?.code === '23505') {
        errorMessage = 'You are already enrolled in this course.';
      }
      
      toast({
        title: 'Enrollment Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  // Render course detail page UI
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {isLoadingCourse ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-brown" />
            <span className="ml-2 text-gray-600">Loading course...</span>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">{error}</h3>
              <div className="mt-4">
                <Button onClick={() => navigate('/dashboard')}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </div>
        ) : course ? (
          <div className="max-w-6xl mx-auto">
            {/* Course header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  {courseCode && (
                    <span className="inline-block bg-brown-light text-brown px-2 py-1 rounded text-sm font-medium mb-2">
                      {courseCode}
                    </span>
                  )}
                  <h1 className="text-2xl font-bold text-gray-900">{cleanTitle}</h1>
                  {course.description && (
                    <p className="mt-2 text-gray-600">{course.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  {isInstructor ? (
                    <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md text-sm">
                      You are the instructor of this course
                    </div>
                  ) : !isEnrolled ? (
                    <Button 
                      onClick={handleEnroll} 
                      disabled={isEnrolling}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isEnrolling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        'Enroll in Course'
                      )}
                    </Button>
                  ) : (
                    <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md text-sm">
                      You are enrolled in this course
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Course content */}
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setTab('stream')}
                    className={`${tab === 'stream' ? 'border-brown text-brown' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Stream
                  </button>
                  <button
                    onClick={() => setTab('content')}
                    className={`${tab === 'content' ? 'border-brown text-brown' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Content
                  </button>
                  <button
                    onClick={() => setTab('students')}
                    className={`${tab === 'students' ? 'border-brown text-brown' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Students
                  </button>
                  {isInstructor && (
                    <button
                      onClick={() => setTab('grades')}
                      className={`${tab === 'grades' ? 'border-brown text-brown' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Grades
                    </button>
                  )}
                  {(isInstructor || isClassAdmin) && (
                    <button
                      onClick={() => setTab('settings')}
                      className={`${tab === 'settings' ? 'border-brown text-brown' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      Settings
                    </button>
                  )}
                </nav>
              </div>
              
              {/* Tab content */}
              <div>
                {tab === 'stream' && (
                  <div>
                    {isInstructor && (
                      <div className="mb-6">
                        <Button 
                          onClick={() => setIsAnnouncementModalOpen(true)}
                          className="flex items-center"
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          New Announcement
                        </Button>
                      </div>
                    )}
                    
                    {/* Announcements list */}
                    <div className="space-y-6">
                      {announcements.length > 0 ? (
                        announcements.map((announcement) => (
                          <div key={announcement.id} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                                <p className="text-sm text-gray-500">
                                  Posted by {announcement.full_name || 'Instructor'} • {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              {announcement.is_pinned && (
                                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                                  Pinned
                                </span>
                              )}
                            </div>
                            <div className="mt-2 prose prose-sm max-w-none">
                              {announcement.content}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements</h3>
                          <p className="mt-1 text-sm text-gray-500">
                            There are no announcements for this course yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {tab === 'content' && (
                  <div>
                    <CourseContentViewer />
                  </div>
                )}
                
                {tab === 'students' && (
                  <div>
                    <ClassmatesList courseId={courseId} />
                  </div>
                )}
                
                {tab === 'grades' && isInstructor && (
                  <div>
                    <StudentGradesList courseId={courseId} />
                  </div>
                )}
                
                {tab === 'settings' && (isInstructor || isClassAdmin) && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Course Settings</h2>
                    {/* Settings content */}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
      
      {/* Announcement modal */}
      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => {
          setIsAnnouncementModalOpen(false);
          // Refresh announcements
          queryClient.invalidateQueries({ queryKey: ['announcements', courseId] });
        }}
        courseId={courseId}
      />
    </div>
  );
};

// Wrap component with error boundary
export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ initialCourseData }) => {
  return (
    <ErrorBoundary>
      <CourseDetailPageContent initialCourseData={initialCourseData} />
    </ErrorBoundary>
  );
}