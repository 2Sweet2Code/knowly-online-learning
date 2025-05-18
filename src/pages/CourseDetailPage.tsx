import { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
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

// Define a type for the course admin data
interface CourseAdmin {
  id: string;
  user_id: string;
  course_id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

// Error Boundary Types
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error Boundary Component
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // You can also log the error to your error tracking service here
    // logErrorToService(error, errorInfo);
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

// Import CourseComment type from database types
import type { CourseComment } from '@/types/database.types';

interface CourseDetailPageProps {
  initialCourseData?: Course | null;
}

const CourseDetailPageContent = ({ initialCourseData }: CourseDetailPageProps = {}) => {
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
  
  // Comments state
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isPublicComment, setIsPublicComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  
  // Admin state
  const [isClassAdmin, setIsClassAdmin] = useState(false);
  const [isCheckingAdminStatus, setIsCheckingAdminStatus] = useState(false);
  const [adminCheckError, setAdminCheckError] = useState<PostgrestError | null>(null);

  // Fetch course details with instructor info
  const { data: course, isLoading: queryLoading, error: queryError } = useQuery({
    initialData: initialCourseData || undefined,
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          profiles!instructor_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('id', courseId)
        .single();
      
      if (error) {
        console.error('Error fetching course:', error);
        setError('Ky kurs nuk u gjet ose nuk ekziston më.');
        return null;
      }
      
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        image: data.image,
        category: data.category,
        instructor: data.profiles?.full_name || 'Instructor',
        instructorId: data.instructor_id,
        instructorAvatar: data.profiles?.avatar_url,
        students: data.students || 0,
        status: data.status,
        price: data.price,
        isPaid: data.isPaid,
        created_at: data.created_at,
        updated_at: data.updated_at,
        accessCode: data.accessCode
      } as Course;
    },
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch announcements for this course
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          profiles!instructor_id (
            full_name,
            avatar_url
          )
        `)
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching announcements:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!courseId,
  });
  
  // Check if current user is the instructor
  const { data: isUserInstructor } = useQuery({
    queryKey: ['isInstructor', course?.id, user?.id],
    queryFn: async () => {
      if (!course?.id || !user?.id) return false;
      
      const { data, error } = await supabase.rpc('check_course_admin', {
        user_id: user.id,
        course_id_param: course.id
      });
      
      if (error) {
        console.error('Error checking instructor status:', error);
        return false;
      }
      
      return data || false;
    },
    enabled: !!course?.id && !!user?.id,
  });
  
  // Check if user is the course instructor or an admin
  const isUserCourseInstructor = user?.id === course?.instructor_id || user?.role === 'admin';
  
  // Combine all instructor checks
  const isInstructor = isUserInstructor || isClassAdmin || isUserCourseInstructor;

  // Always call useEffect, but only run logic if no error
  useEffect(() => {
    if (error) return; // Don't run if there's a 404
    const checkEnrollment = async () => {
      if (!user || !courseId || !course) return;
      
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();
        
        if (error) {
          console.error('Error checking enrollment:', error);
          return;
        }
        
        setIsEnrolled(!!data);
      } catch (err) {
        console.error('Unexpected error checking enrollment:', err);
      }
    };
    
    checkEnrollment();
  }, [user, courseId, course, error]);

  // Enroll handler must be a function, not floating code
  const handleEnroll = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please log in to enroll.", variant: "destructive" });
      navigate('/login');
      return;
    }
    if (!course) return;
    setIsSubmitting(true);
    try {
      // Validate access code
      if (course.accessCode && accessCode.trim() !== course.accessCode) {
        toast({ title: "Invalid Code", description: "Access code is incorrect.", variant: "destructive" });
        return;
      }
      // Directly insert enrollment record
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({ user_id: user.id, course_id: course.id, progress: 0, completed: false });
      if (enrollError) throw enrollError;
      toast({ title: "Success!", description: "You have been enrolled successfully." });
      setIsEnrolled(true);
    } catch (err) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (err instanceof Error) { errorMessage = err.message; }
      console.error("Enrollment failed:", err);
      toast({ title: "Enrollment Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAnnouncementModal = () => {
    if (!user || !courseId) {
      toast({
        title: "Error",
        description: "You need to be logged in to create an announcement.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnnouncementModalOpen(true);
  };

  const handlePaymentSuccess = async (details: unknown, data: unknown) => {
    if (!user || !course || !courseId) {
       console.error("Payment approved but user/course undefined");
       toast({ title: "Error", description: "User or Course data missing. Cannot enroll.", variant: "destructive" });
       return;
    }
    console.log("Payment Details (unknown):", details);
    console.log("Payment Data (unknown):", data);
    setIsSubmitting(true);
    try {
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({ user_id: user.id, course_id: courseId, progress: 0, completed: false });
      if (enrollError) throw enrollError;
      toast({ title: "Success!", description: "Payment successful and enrolled!" });
      setIsEnrolled(true);
    } catch (err) {
       let errorMessage = "Payment successful, but enrollment failed.";
       if (err instanceof Error) errorMessage = err.message;
       console.error("Post-payment enrollment failed:", err);
       toast({ title: "Enrollment Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch course comments
  const { 
    data: courseComments = [], 
    isLoading: isLoadingComments,
    refetch: refetchComments
  } = useQuery<CourseComment[]>({
    queryKey: ['courseComments', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      try {
        const { data, error } = await supabase
          .from('course_comments')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching comments:', err);
        // Try to get comments from localStorage as fallback
        const localComments = localStorage.getItem(`course_comments_${courseId}`);
        return localComments ? JSON.parse(localComments) as CourseComment[] : [];
      }
    },
    enabled: !!courseId,
  });

  // Function to handle comment submission
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user || !courseId) return;
    
    setIsSubmittingComment(true);
    
    try {
      const { error } = await supabase
        .from('course_comments')
        .insert({
          course_id: courseId,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          content: commentText,
          is_public: isPublicComment,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error submitting comment:', error);
        toast({
          title: 'Error',
          description: 'Failed to submit your comment. Please try again.',
          variant: 'destructive',
        });
      } else {
        // Clear form and refetch comments
        setCommentText('');
        setIsPublicComment(false);
        
        toast({
          title: 'Success!',
          description: 'Your comment was submitted successfully.',
        });
        
        // Refresh comments list
        refetchComments();
      }
    } catch (err) {
      console.error('Unexpected error submitting comment:', err);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handlePaymentError = (err: unknown) => {
    let errorMessage = "An error occurred during payment. Please try again.";
    if (err instanceof Error) {
      errorMessage = err.message;
    } else if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
      errorMessage = err.message;
    } else if (typeof err === 'string'){
        errorMessage = err;
    }
    console.error("PayPal Error:", err);
    toast({ title: "Payment Error", description: errorMessage, variant: "destructive" });
  };

  // Extract course code from title (temporary solution until we have a proper accessCode field)
  const codeMatch = course?.title?.match(/\[(.*?)\]/);
  const courseCode = codeMatch ? codeMatch[1] : null;
  const cleanTitle = course?.title?.replace(/\s*\[.*?\]\s*/, '') ?? '';

  // Check if Supabase client is initialized
  const isSupabaseInitialized = () => {
    if (!supabase) {
      console.error('Supabase client is not initialized');
      return false;
    }
    return true;
  };

  // Admin status check with direct query
  useEffect(() => {
    if (!user || !courseId) return;

    let isMounted = true;

    const checkAdminStatus = async () => {
      try {
        // If user is instructor, they are automatically an admin
        if (isInstructor) {
          if (isMounted) setIsClassAdmin(true);
          return;
        }

        if (isMounted) setIsCheckingAdminStatus(true);
        
        // Direct query without complex type assertions
        const result = await supabase
          .from('course_admins')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .eq('status', 'approved')
          .maybeSingle();
        
        if (!isMounted) return;
        
        const { data, error } = result;
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Error checking admin status:', error);
          setAdminCheckError(error);
          return;
        }
        
        setIsClassAdmin(!!data?.id);
      } catch (err) {
        console.error('Error in admin status check:', err);
        if (isMounted) {
          setAdminCheckError(err as PostgrestError);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAdminStatus(false);
        }
      }
    };

    checkAdminStatus();

    return () => {
      isMounted = false;
    };
  }, [user, courseId, isInstructor, setIsClassAdmin, setIsCheckingAdminStatus, setAdminCheckError]);

  const isStudent = !!user && !isInstructor && user.role !== 'admin' && !isClassAdmin;

  if (queryLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brown" />
            <p className="text-lg text-brown">Po ngarkohet kursi...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-cream">
          <div className="bg-white p-10 rounded shadow text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">404: Kursi nuk u gjet</h1>
            <p className="mb-4">Ky kurs nuk ekziston ose është fshirë.</p>
            <button className="btn btn-primary" onClick={() => navigate('/courses')}>Kthehu te Kurset</button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-lightGray flex flex-col py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-playfair font-bold">{cleanTitle}</h2>
          <Link to="/" className="text-brown hover:text-gold transition-colors">
            <Home className="h-5 w-5" />
          </Link>
        </div>
        <nav className="flex flex-col gap-2">
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'stream' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('stream')}>
            <Bell className="h-4 w-4" /> Stream
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'content' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('content')}>
            <span>📚</span> Përmbajtja
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'students' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('students')}>
            <Users className="h-4 w-4" /> Studentët
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'grades' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('grades')}>
            <GraduationCap className="h-4 w-4" /> Notat
          </button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded transition ${tab === 'settings' ? 'bg-cream font-semibold' : 'hover:bg-cream/50'}`} onClick={() => setTab('settings')}>
            <span>⚙️</span> Cilësimet
          </button>
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 py-10 px-8">
        {/* Stream Tab */}
        {tab === 'stream' && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold font-playfair">Njoftime</h3>
              {(isInstructor || user?.role === 'admin' || isClassAdmin) ? (
                <button 
                  className="btn bg-gold text-brown font-semibold"
                  onClick={() => setIsAnnouncementModalOpen(true)}
                >
                  Publiko Njoftim
                </button>
              ) : null}
            </div>
            
            {/* Announcement Modal */}
            <AnnouncementModal 
              isOpen={isAnnouncementModalOpen} 
              onClose={() => setIsAnnouncementModalOpen(false)} 
              courseId={courseId}
            />
            {/* Announcements list */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Njoftime</h2>
                {isInstructor && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAnnouncementModal}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Shto Njoftim
                  </Button>
                )}
              </div>
              
              {announcements.length === 0 ? (
                <div className="text-center py-8 border rounded-lg">
                  <p className="text-gray-500">Nuk ka njoftime akoma.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div key={announcement.id} className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {announcement.profiles?.avatar_url ? (
                            <img 
                              src={announcement.profiles.avatar_url} 
                              alt={announcement.profiles.full_name}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{announcement.title}</h3>
                            <span className="text-xs text-gray-500">
                              {new Date(announcement.created_at).toLocaleDateString('sq-AL')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">
                            {announcement.content}
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            Postuar nga {announcement.profiles?.full_name || 'Instructor'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Comments section */}
            <div className="mb-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Komentet e kursit
              </h4>
              
              {/* Display existing comments */}
              {isLoadingComments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span>Duke ngarkuar komentet...</span>
                </div>
              ) : courseComments.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {courseComments.map(comment => (
                    <div key={comment.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="bg-brown/10 text-brown p-1.5 rounded-full">
                            <User className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{comment.user_name || 'Student'}</span>
                          {!comment.is_public && (
                            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">Privat</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: sq })}
                        </div>
                      </div>
                      <p className="mt-2 text-gray-700">{comment.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg mb-6">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Nuk ka komente ende. Ji i pari që komenton!</p>
                </div>
              )}
              
              {/* Comment form */}
              {user && (
                <form 
                  className="bg-white rounded-lg shadow-sm p-4 border border-gray-100 space-y-3"
                  onSubmit={handleSubmitComment}
                >
                  <textarea
                    className="w-full p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gold"
                    placeholder="Shkruaj një koment..."
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={isSubmittingComment}
                    required
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <input 
                      type="checkbox" 
                      id="publicComment" 
                      className="accent-gold" 
                      checked={isPublicComment}
                      onChange={(e) => setIsPublicComment(e.target.checked)}
                      disabled={isSubmittingComment}
                    />
                    <label htmlFor="publicComment" className="text-sm">Bëje publike për të gjithë klasën</label>
                  </div>
                  <button 
                    type="submit"
                    className="btn btn-primary flex items-center justify-center gap-2"
                    disabled={isSubmittingComment || !commentText.trim()}
                  >
                    {isSubmittingComment && (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    Dërgo Koment
                  </button>
                </form>
              )}
            </div>
          </section>
        )}
        {/* Content Tab */}
        {tab === 'content' && (
          <section>
            <h3 className="text-2xl font-bold font-playfair mb-6">Përmbajtja e Kursit</h3>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <CourseContentViewer />
              {isInstructor && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // TODO: Implement add content modal
                      toast({
                        title: "Funksionaliteti në zhvillim",
                        description: "Shtimi i përmbajtjes së re do të jetë i disponueshëm së shpejti.",
                      });
                    }}
                    className="flex items-center gap-2"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Shto Përmbajtje të Re
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}
        {/* Students Tab */}
        {tab === 'students' && (
          <section>
            <h3 className="text-2xl font-bold font-playfair mb-6">Studentët</h3>
            <ClassmatesList courseId={courseId as string} />
          </section>
        )}
        {/* Grades Tab */}
        {tab === 'grades' && (
          <section>
            <h3 className="text-2xl font-bold font-playfair mb-6">Notat</h3>
            <StudentGradesList courseId={courseId as string} />
          </section>
        )}
        {/* Settings Tab */}
        {tab === 'settings' && (
          <section>
            <h3 className="text-2xl font-bold font-playfair mb-6">Cilësimet e Kursit</h3>
            {/* Settings form or info here */}
            <div className="bg-white rounded shadow px-4 py-6 text-gray-500 text-center">(Cilësimet do të shtohen këtu)</div>
          </section>
        )}
      </main>
    </div>
  );
};

// Main component wrapped with ErrorBoundary
const CourseDetailPage = (props: CourseDetailPageProps) => (
  <ErrorBoundary>
    <CourseDetailPageContent {...props} />
  </ErrorBoundary>
);


export default CourseDetailPage;
