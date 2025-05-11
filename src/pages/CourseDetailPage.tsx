import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Course } from "@/types";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Loader2, BookOpen, Users, Calendar, Clock, Award, ShoppingCart, AlertCircle, KeyRound, LogIn } from "lucide-react";
import { PayPalButtons } from "@paypal/react-paypal-js";

const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Fetch course details
  const { data: courseData, isLoading: queryLoading } = useQuery({
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
      if (!user || !courseData) return;
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseData.id)
        .maybeSingle();
      if (error) {
        console.error('Error checking enrollment:', error);
        return;
      }
      setIsEnrolled(!!data);
    };
    checkEnrollment();
  }, [user, courseData, error]);

  // Show a 404 error if course not found
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

  // Enroll handler must be a function, not floating code
  const handleEnroll = async () => {
    if (!user) {
      toast({ title: "Error", description: "Please log in to enroll.", variant: "destructive" });
      navigate('/login');
      return;
    }
    if (!courseData) return;
    setIsSubmitting(true);
    try {
      // Validate access code
      if (courseData.accessCode && accessCode.trim() !== courseData.accessCode) {
        toast({ title: "Invalid Code", description: "Access code is incorrect.", variant: "destructive" });
        return;
      }
      // Directly insert enrollment record
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({ user_id: user.id, course_id: courseData.id, progress: 0, completed: false });
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
  
  const handlePaymentSuccess = async (details: unknown, data: unknown) => {
    if (!user || !courseData) {
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
        .insert({ user_id: user.id, course_id: courseData.id, progress: 0, completed: false });
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

  if (!courseData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-playfair font-bold mb-4">Kursi nuk u gjet</h2>
            <p className="mb-6">Kursi që po kërkoni nuk ekziston ose është fshirë.</p>
            <button 
              onClick={() => navigate('/courses')}
              className="btn btn-primary"
            >
              Kthehu te Kurset
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Extract course code from title (temporary solution until we have a proper accessCode field)
  const codeMatch = courseData.title.match(/\[(.*?)\]/);
  const courseCode = codeMatch ? codeMatch[1] : null;
  const cleanTitle = courseData.title.replace(/\s*\[.*?\]\s*/, '');

  const isInstructor = user?.id === courseData.instructorId;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="bg-white p-8 rounded-lg shadow-lg border border-lightGray">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="md:w-1/3">
                <img 
                  src={courseData.image || "/fallback-image.png"} 
                  alt={cleanTitle} 
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== '/fallback-image.png') {
                      target.src = '/fallback-image.png';
                    }
                  }}
                  className="rounded-lg w-full h-auto object-cover"
                />
              </div>
              <div className="md:w-2/3">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 bg-gold text-brown text-sm font-semibold rounded-full">
                    {courseData.category === 'programim' ? 'Programim' :
                      courseData.category === 'dizajn' ? 'Dizajn' :
                        courseData.category === 'marketing' ? 'Marketing' : 'Tjetër'}
                  </span>
                  {courseData.isPaid && (
                    <span className="px-3 py-1 bg-cream text-brown text-sm font-semibold rounded-full">
                      Me pagesë
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold mb-2 font-playfair">{courseData.title}</h2>
                <p className="text-gray-700 mb-4">{courseData.description}</p>
                <div className="flex items-center gap-6 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brown" />
                    <span>{courseData.students} studentë</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-brown" />
                    <span>nga: {courseData.instructor}</span>
                  </div>
                </div>
                <div className="mt-6">
                  {isEnrolled ? (
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md">
                      <p className="font-semibold">Ju jeni regjistruar në këtë kurs.</p>
                    </div>
                  ) : courseData.isPaid ? (
                    <div className="p-6 border rounded-lg bg-gray-50">
                      <h3 className="text-lg font-semibold mb-3">Regjistrohu në Kurs (€{courseData.price})</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Për të aksesuar këtë kurs, ju lutemi kryeni pagesën e sigurt përmes PayPal.
                      </p>
                      {isSubmitting ? (
                        <div className="flex justify-center items-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Duke procesuar pagesën...
                        </div>
                      ) : (
                        <PayPalButtons
                          style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
                          createOrder={(data, actions) => {
                            if (!courseData.price) {
                              console.error("Course price is missing. Cannot create order.");
                              return Promise.reject(new Error("Course price missing")); 
                            }
                            return actions.order.create({
                              intent: "CAPTURE",
                              purchase_units: [{
                                amount: {
                                  value: courseData.price.toString(),
                                  currency_code: "EUR"
                                },
                                description: `Enrollment: ${courseData.title}`
                              }]
                            });
                          }}
                          onApprove={(data, actions) => {
                             if (actions.order) {
                                return actions.order.capture().then(details => {
                                    handlePaymentSuccess(details, data);
                                }).catch(captureError => {
                                    console.error("PayPal capture error:", captureError);
                                    handlePaymentError(captureError);
                                });
                             } else {
                                console.error("PayPal actions.order is undefined");
                                handlePaymentError(new Error("PayPal order actions not available"));
                                return Promise.resolve();
                             }
                          }}
                          onError={handlePaymentError}
                          disabled={isSubmitting}
                        />
                      )}
                      <p className="text-xs text-gray-500 mt-3">Pagesat procesohen në mënyrë të sigurt nga PayPal.</p>
                    </div>
                  ) : (
                    <div className="p-6 border rounded-lg bg-gray-50">
                      <h3 className="text-lg font-semibold mb-3">Regjistrohu në Kurs</h3>
                      <p className="text-sm text-gray-600 mb-4">Për të aksesuar këtë kurs falas, fut kodin e aksesit:</p>
                      <div className="flex items-center space-x-2">
                        <KeyRound className="h-5 w-5 text-gray-400" />
                        <input 
                          type="text" 
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value)}
                          placeholder="Kodi i Aksesit"
                          className="flex-grow px-3 py-2 border border-lightGray rounded-md focus:outline-none focus:ring-1 focus:ring-brown"
                          disabled={isSubmitting}
                        />
                      </div>
                      <button 
                        onClick={handleEnroll}
                        className="mt-4 btn btn-primary w-full flex justify-center items-center"
                        disabled={isSubmitting || !accessCode.trim()}
                      >
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />} 
                        Regjistrohu
                      </button>
                    </div>
                  )} 
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CourseDetailPage;
