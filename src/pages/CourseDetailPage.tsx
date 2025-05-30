import React, { useState, useEffect, Component, ErrorInfo, ReactNode, useCallback } from 'react';
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestError } from '@supabase/supabase-js';
import { CourseContentViewer } from "@/components/course/CourseContentViewer";
import { Loader2, User, Clock, Users, AlertCircle, Home, GraduationCap, Bell, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Course } from "@/types";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ClassmatesList } from "../components/ClassmatesList";
import { StudentGradesList } from "../components/StudentGradesList";
import { CourseAnnouncements } from "@/components/course/CourseAnnouncements";
import { CourseContentManager } from "@/components/course/CourseContentManager";
import { CoursePreview } from "@/components/course/CoursePreview";
import { CourseSettings } from "@/components/course/CourseSettings";

interface CourseAdmin {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  role: string;
  progress: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
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
  // Note: Announcements are now managed by the CourseAnnouncements component
  
  // Clean up the title (remove any existing code in brackets)
  const cleanTitle = course?.title?.replace(/\s*\[.*?\]\s*/, '') ?? '';

  // Define the database course type from courses_with_student_count view
  interface DBCourseRow {
    id: string;
    title: string;
    description: string;
    image: string;
    category: string;
    instructor: string;
    instructor_id: string;
    student_count: number; // From the view
    status: string;
    price: number;
    isPaid: boolean;
    created_at: string;
    updated_at: string;
    accessCode: string;
    allow_admin_applications: boolean;
    preview_content: string;
  }

  // Map database course to our frontend Course type
  const mapDbCourseToCourse = useCallback((dbCourse: DBCourseRow): Course => {
    const course: Course = {
      id: dbCourse.id,
      title: dbCourse.title,
      description: dbCourse.description,
      image: dbCourse.image,
      category: dbCourse.category as 'programim' | 'dizajn' | 'marketing' | 'other',
      instructor: dbCourse.instructor,
      instructor_id: dbCourse.instructor_id,
      instructorId: dbCourse.instructor_id,
      instructor_name: dbCourse.instructor, // Will be updated later if available
      students: dbCourse.student_count || 0, // Use student_count from the view
      student_count: dbCourse.student_count || 0, // New field
      status: (dbCourse.status as 'draft' | 'active' | 'archived') || 'draft',
      price: dbCourse.price,
      isPaid: dbCourse.isPaid,
      created_at: dbCourse.created_at,
      updated_at: dbCourse.updated_at,
      accessCode: dbCourse.accessCode,
      allow_admin_applications: dbCourse.allow_admin_applications,
      preview_content: dbCourse.preview_content
    };
    
    console.log('Mapped course:', {
      ...course,
      accessCode: dbCourse.accessCode ? '***' + dbCourse.accessCode.slice(-3) : 'undefined'
    });
    
    return course;
  }, []); // Empty dependency array since this function doesn't depend on any external values

  // Fetch course data
  const { data: courseData, isLoading: isLoadingCourse } = useQuery<Course>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) throw new Error('Course ID is required');
      
      try {
        // First, get the basic course data with student count from the view
        const { data: courseData, error: courseError } = await supabase
          .from('courses_with_student_count')
          .select('*')
          .eq('id', courseId)
          .single<DBCourseRow>();
          
        if (courseData) {
          console.log('Raw course data from DB:', {
            ...courseData,
            accessCode: courseData.accessCode ? '***' + courseData.accessCode.slice(-3) : 'undefined',
            isPaid: courseData.isPaid
          });
        }
          
        if (courseError) throw courseError;
        if (!courseData) throw new Error('Course not found');
        
        // Map database course to our Course type and add instructor name if available
        const course = mapDbCourseToCourse(courseData);
        
        console.log('Course data loaded:', course); // Debug log
        
        // Get instructor name if not already set
        if (courseData.instructor_id && !course.instructor_name) {
          const { data: instructorData, error: instructorError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', courseData.instructor_id)
            .single();
            
          if (!instructorError && instructorData?.full_name) {
            course.instructor_name = instructorData.full_name;
          }
        }
        
        // Check if user is enrolled and get user role in a separate query
        if (user) {
          try {
            const { data: enrollmentData, error: enrollmentError } = await supabase
              .from('enrollments')
              .select('*')
              .eq('course_id', courseId)
              .eq('user_id', user.id)
              .maybeSingle();
              
            if (enrollmentError) {
              console.error('Error checking enrollment:', enrollmentError);
            } else if (enrollmentData) {
              setIsEnrolled(true);
              setIsInstructor(enrollmentData.role === 'instructor');
              setIsAdmin(enrollmentData.role === 'admin');
            } else {
              // Check if user is the course instructor
              const isUserInstructor = course.instructorId === user.id;
              setIsEnrolled(isUserInstructor);
              setIsInstructor(isUserInstructor);
              
              // Check if user is an admin
              const { data: profileData } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
                
              if (profileData?.role === 'admin') {
                setIsAdmin(true);
              }
            }
          } catch (err) {
            console.error('Error checking user role:', err);
          }
        } else {
          // For unauthenticated users, ensure they see the preview
          setIsEnrolled(false);
          setIsInstructor(false);
          setIsAdmin(false);
        }
        
        return course;
      } catch (error) {
        console.error('Error fetching course:', error);
        setError('Failed to load course data');
        return null;
      }
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
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
        // Get the course data from the database
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single<DBCourseRow>();

        if (courseError) {
          throw courseError;
        }
        
        if (!courseData) {
          throw new Error('Course not found');
        }
        
        // Map the database course to our Course type
        const mappedCourse = mapDbCourseToCourse(courseData);
        
        // Update the course state with the mapped data
        setCourse(mappedCourse);
        
        // Check if user is the instructor
        const isUserInstructor = mappedCourse.instructorId === user.id;
        
        // Check if user is enrolled in a separate query
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (enrollmentError) {
          console.error('Error checking enrollment:', enrollmentError);
          // Don't throw, just assume not enrolled
        }

        // Update state
        setIsInstructor(isUserInstructor);
        setIsEnrolled(!!enrollmentData || isUserInstructor);
        
      } catch (error) {
        console.error('Error in checkEnrollment:', error);
        setError('Failed to check course enrollment status');
      }
    };

    if (user?.id && courseId) {
      checkEnrollment();
    }
  }, [user, courseId, mapDbCourseToCourse]);

  const handleEnrollClick = () => {
    if (!user?.id) {
      setError('Ju duhet të jeni të kyçur për t\'u regjistruar në një kurs');
      return;
    }
    
    if (!course) {
      setError('Kursi nuk u gjet');
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
    
    // Show the access code form
    setShowEnrollForm(true);
  };
  
  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accessCode.trim()) {
      toast({
        title: 'Access Code Required',
        description: 'Please enter the access code to enroll in this course.',
        variant: 'destructive',
      });
      return;
    }
    
    await handleEnroll(accessCode);
  };
  
  const handleEnroll = async (code: string) => {
    if (!user?.id || !courseId) {
      setError('Ju duhet të jeni të kyçur për t\'u regjistruar në një kurs');
      return;
    }
    
    if (!course) {
      setError('Kursi nuk u gjet');
      return;
    }
    
    setIsEnrolling(true);
    
    try {
      // First verify the access code
      const { data: courseData, error: codeError } = await supabase
        .from('courses')
        .select('accessCode')
        .eq('id', courseId)
        .single();
        
      if (codeError) {
        console.error('Error fetching course data:', codeError);
        throw new Error('Failed to verify access code. Please try again.');
      }
      
      // Check if the access code matches (case-sensitive)
      if (courseData?.accessCode && courseData.accessCode !== code) {
        throw new Error('Invalid access code. Please check and try again.');
      }
      
      // Check if the user is already enrolled
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking existing enrollment:', checkError);
        throw checkError;
      }
      
      if (existingEnrollment) {
        throw new Error('You are already enrolled in this course.');
      }
      
      // Prepare enrollment data
      const enrollmentData = {
        user_id: user.id,
        course_id: courseId,
        role: 'student',
        progress: 0,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Remove any undefined values to avoid RLS issues
      Object.keys(enrollmentData).forEach(key => 
        enrollmentData[key] === undefined && delete enrollmentData[key]
      );
      
      console.log('Attempting to enroll with data:', enrollmentData);
      
      // Create new enrollment
      const { data, error } = await supabase
        .from('enrollments')
        .insert(enrollmentData)
        .select()
        .single();

      if (error) {
        console.error('Detailed enrollment error:', error);
        // Check if it's a unique violation
        if (error.code === '23505') { // Unique violation
          throw new Error('You are already enrolled in this course.');
        }
        throw error;
      }

      setIsEnrolled(true);
      
      // Invalidate relevant queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['course', courseId, 'enrollments'] }),
        queryClient.invalidateQueries({ queryKey: ['student-enrollments', user.id] })
      ]);
      
      // Update local state
      setIsEnrolled(true);
      setShowEnrollForm(false);
      
      toast({
        title: 'Regjistrimi u krye me sukses',
        description: 'Ju jeni regjistruar me sukses në këtë kurs.',
      });
      
      // Refresh the page to ensure all data is up to date
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
                  {course?.accessCode && (isEnrolled || isInstructor) && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center">
                          <span className="font-medium text-blue-800 mr-2">Course Access Code:</span>
                          <div className="relative">
                            <span className="font-mono bg-white px-3 py-1.5 rounded border border-blue-300 text-blue-700 text-sm sm:text-base">
                              {course.accessCode}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(course.accessCode || '');
                                toast({
                                  title: 'Copied!',
                                  description: 'Access code copied to clipboard.',
                                });
                              }}
                              className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                              title="Copy to clipboard"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(course.accessCode || '');
                            toast({
                              title: 'Copied!',
                              description: 'Access code copied to clipboard.',
                            });
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          title="Copy code"
                        >
                          Copy
                        </button>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Share this code with students who want to join this course.
                      </p>
                    </div>
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
                    <>
                      {showEnrollForm ? (
                        <div className="space-y-4 bg-gray-50 p-4 rounded-md border border-gray-200">
                          <h3 className="font-medium text-gray-900">Enter Access Code</h3>
                          <form onSubmit={handleAccessCodeSubmit} className="flex space-x-2">
                            <input
                              type="text"
                              value={accessCode}
                              onChange={(e) => setAccessCode(e.target.value)}
                              placeholder="Enter access code"
                              className="flex-1 min-w-0 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-brown focus:border-brown sm:text-sm"
                              disabled={isEnrolling}
                            />
                            <Button 
                              type="submit"
                              disabled={isEnrolling}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isEnrolling ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                'Verify Code'
                              )}
                            </Button>
                          </form>
                          <p className="text-sm text-gray-500 mt-1">
                            Please enter the access code provided by your instructor.
                          </p>
                        </div>
                      ) : (
                        <Button 
                          onClick={handleEnrollClick}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Enroll in Course
                        </Button>
                      )}
                    </>
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
                  {(isInstructor || isEnrolled) && (
                    <button
                      onClick={() => setTab('grades')}
                      className={`${tab === 'grades' ? 'border-brown text-brown' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                      {isInstructor ? 'Grades' : 'My Grades'}
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
                {!isEnrolled && !isInstructor ? (
                  // Show course preview for non-enrolled users
                  <CoursePreview 
                    course={course}
                    onEnrollClick={handleEnrollClick}
                    isAuthenticated={!!user}
                    isEnrolling={isEnrolling}
                  />
                ) : (
                  // Show regular course content for enrolled users and instructors
                  <>
                    {tab === 'stream' && courseId && (
                      <CourseAnnouncements 
                        courseId={courseId} 
                        isInstructor={isInstructor} 
                      />
                    )}
                    
                    {tab === 'content' && (
                      <div>
                        {isInstructor ? (
                          <CourseContentManager courseId={courseId || ''} isInstructor={isInstructor} />
                        ) : (
                          <CourseContentViewer />
                        )}
                      </div>
                    )}
                    
                    {tab === 'students' && (
                      <div>
                        <ClassmatesList courseId={courseId} />
                      </div>
                    )}
                    
                    {tab === 'grades' && (isInstructor || isEnrolled) && (
                      <div>
                        <StudentGradesList courseId={courseId} />
                      </div>
                    )}
                    
                    {tab === 'settings' && (isInstructor || isClassAdmin) && course && (
                      <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-900">Course Settings</h2>
                        <CourseSettings 
                          courseId={course.id}
                          initialPreviewContent={course.preview_content || ''}
                          onUpdate={() => {
                            // Invalidate course query to refresh the data
                            queryClient.invalidateQueries({
                              queryKey: ['course', courseId]
                            });
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
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