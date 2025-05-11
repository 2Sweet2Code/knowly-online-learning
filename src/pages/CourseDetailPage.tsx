import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../context/AuthContext";
import { Loader2, MessageSquare, User, Clock, Users, AlertCircle, Home, GraduationCap, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";
import type { PostgrestError } from '@supabase/postgrest-js';
import { useToast } from "@/hooks/use-toast";
import { Course } from "@/types";
import type { Database } from '@/integrations/supabase/types';
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ClassmatesList } from "../components/ClassmatesList";
import { StudentGradesList } from "../components/StudentGradesList";
import { AnnouncementModal } from "../components/dashboard/AnnouncementModal";
import { CourseComment, getCourseComments, insertCourseComment } from "@/types/course-comments";

// CourseComment type is now imported from @/types/course-comments

const CourseDetailPage = () => {
  const [tab, setTab] = useState<'stream' | 'content' | 'students' | 'grades' | 'settings'>('stream');
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isPublicComment, setIsPublicComment] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (courseId && queryLoading) {
      timeoutId = setTimeout(() => {
        // If still loading after 10 seconds, force reload the page
        console.log('Loading timeout reached, reloading page...');
        window.location.reload();
      }, 10000);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [courseId, queryLoading]);
  
  // Fetch course details
  const { data: course, isLoading: queryLoading, error: queryError } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
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
        instructor: data.instructor,
        instructorId: data.instructor_id,
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
    data: comments = [], 
    isLoading: isLoadingComments,
    refetch: refetchComments
  } = useQuery({
    queryKey: ['courseComments', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      try {
        // Use the helper function for type-safe access to course_comments
        const { data, error } = await getCourseComments(supabase, courseId);
        
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching comments:', err);
        // Try to get comments from localStorage as fallback
        const localComments = localStorage.getItem(`course_comments_${courseId}`);
        return localComments ? JSON.parse(localComments) : [];
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
      // Use the helper function for type-safe insertion
      const { error } = await insertCourseComment(supabase, {
        course_id: courseId,
        user_id: user.id,
        content: commentText,
        is_public: isPublicComment,
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

  const isInstructor = user?.id === course?.instructorId || user?.role === 'admin';

  // Use state for admin status instead of a query to avoid type issues
  const [isClassAdmin, setIsClassAdmin] = useState(false);
  const [isCheckingAdminStatus, setIsCheckingAdminStatus] = useState(false);
  
  // Simplified admin status check
  useEffect(() => {
    // Skip if no user or course ID
    if (!user?.id || !courseId) {
      setIsClassAdmin(false);
      return;
    }
    
    setIsCheckingAdminStatus(true);
    
    // Simple function to check admin status
    const checkAdminStatus = async () => {
      try {
        // Direct database query to check admin status
        const { data, error } = await supabase
          .from('course_admins')
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .limit(1);
        
        if (error) {
          console.error('Error checking admin status:', error.message);
          setIsClassAdmin(false);
        } else {
          // User is an admin if we found any matching rows
          setIsClassAdmin(Array.isArray(data) && data.length > 0);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsClassAdmin(false);
      } finally {
        setIsCheckingAdminStatus(false);
      }
    };
    
    checkAdminStatus();
  }, [user?.id, courseId]);
  // Define isStudent based on user role and admin status
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
            <div className="space-y-4 mb-8">
              {/* We'll fetch announcements from the database in the future */}
              <div className="bg-white rounded shadow px-4 py-3 text-center text-gray-500">
                <p>Nuk ka njoftime për këtë kurs aktualisht.</p>
                {(isInstructor || isClassAdmin) && (
                  <button 
                    onClick={handleOpenAnnouncementModal}
                    className="text-brown hover:text-gold text-sm mt-2"
                  >
                    + Shto një njoftim të ri
                  </button>
                )}
              </div>
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
              ) : comments.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {comments.map(comment => (
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
            {/* Add your course content component here */}
            <div className="bg-white rounded shadow px-4 py-6 text-gray-500 text-center">(Përmbajtja do të shtohet këtu)</div>
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

export default CourseDetailPage;
