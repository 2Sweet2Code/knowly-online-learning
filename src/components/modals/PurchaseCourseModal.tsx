import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { Course } from "@/types";

interface PurchaseCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  course: Course | null;
}

export const PurchaseCourseModal = ({ isOpen, onClose, onSuccess, course }: PurchaseCourseModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchaseComplete, setIsPurchaseComplete] = useState(false);
  const [paypalReady, setPaypalReady] = useState(false);
  const [paypalError, setPaypalError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Reset error state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaypalError(null);
      
      // Simple check if PayPal is loaded
      const checkPayPal = () => {
        if (window.paypal) {
          setPaypalReady(true);
          setPaypalError(null);
        } else {
          setPaypalReady(false);
          setPaypalError('PayPal nuk u ngarkua. Ju lutemi rifreskoni faqen ose provoni një metodë tjetër pagese.');
        }
      };
      
      // Initial check
      checkPayPal();
      
      // Set up interval to check if PayPal loads
      const interval = setInterval(checkPayPal, 1000);
      
      // Clear interval on cleanup
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen || !course) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEnrollAfterPayment = async () => {
    if (!user || !course) return;
    
    try {
      setIsLoading(true);
      
      // Check if user is already enrolled
      const { data: existingEnrollment, error: enrollmentCheckError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();
      
      if (enrollmentCheckError) throw enrollmentCheckError;
      
      if (existingEnrollment) {
        toast({
          title: "Informacion",
          description: "Ju jeni tashmë i regjistruar në këtë kurs.",
        });
        if (onSuccess) onSuccess();
        onClose();
        return;
      }
      
      // Check if user is an instructor
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      const isInstructor = userProfile?.role === 'instructor' || userProfile?.role === 'admin';
      
      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
          progress: 0,
          completed: false,
          paid: true,
          payment_amount: course.price || 0,
          payment_date: new Date().toISOString(),
          is_instructor: isInstructor
        })
        .select()
        .single();
      
      if (enrollmentError) throw enrollmentError;
      
      // Invalidate queries to refetch enrollments and courses
      // The student count will be automatically updated via the courses_with_student_count view
      queryClient.invalidateQueries({ queryKey: ['enrollments', user.id] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses_with_student_count'] });
      
      setIsPurchaseComplete(true);
      
      toast({
        title: "Sukses!",
        description: `Ju u regjistruat me sukses në kursin "${course.title}".`,
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Gabim!",
        description: "Ndodhi një problem gjatë regjistrimit në kurs. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex justify-center items-center bg-black bg-opacity-60"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-md rounded-lg shadow-lg p-8 relative animate-fade-in">
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-brown"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        
        <h3 className="text-2xl font-playfair text-center mb-6">Blej Kursin</h3>
        
        {isPurchaseComplete ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-xl font-semibold mb-2">Pagesa u krye me sukses!</h4>
            <p className="text-gray-600 mb-6">Ju tani keni qasje të plotë në kursin "{course.title}"</p>
            <button 
              onClick={onClose}
              className="btn btn-primary btn-block"
            >
              Mbyll
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Kursi:</span>
                <span>{course.title}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Instruktori:</span>
                <span>{course.instructor}</span>
              </div>
              <div className="flex justify-between mb-4">
                <span className="font-semibold">Çmimi:</span>
                <span className="text-lg font-bold">{course.price || 0}€</span>
              </div>
              
              <div className="border-t border-b border-gray-200 py-4 my-4">
                <h4 className="font-semibold mb-2">Metoda e pagesës:</h4>
                
                {paypalError ? (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                    <p>{paypalError}</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-2 text-sm text-red-700 underline hover:text-red-900"
                    >
                      Rifresko faqen
                    </button>
                  </div>
                ) : !paypalReady ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    <span className="ml-2">Duke ngarkuar PayPal...</span>
                  </div>
                ) : (
                  <div className="min-h-[200px] flex items-center justify-center">
                    <PayPalButtons
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          intent: "CAPTURE",
                          purchase_units: [
                            {
                              amount: {
                                value: (course.price || 0).toString(),
                                currency_code: "EUR"
                              },
                              description: `Blerje e kursit: ${course.title}`
                            },
                          ],
                        });
                      }}
                      onApprove={(data, actions) => {
                        return actions.order!.capture().then(() => {
                          handleEnrollAfterPayment();
                        });
                      }}
                      onError={(err) => {
                        console.error('PayPal Error:', err);
                        setPaypalError('Ndodhi një problem me PayPal. Ju lutemi provoni përsëri ose zgjidhni një metodë tjetër pagese.');
                      }}
                      style={{ 
                        layout: "vertical",
                        color: 'gold',
                        shape: 'rect',
                        label: 'pay',
                        height: 45
                      }}
                      forceReRender={[course.id, paypalReady]}
                    />
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Pagesat përpunohen në mënyrë të sigurt përmes PayPal
                </p>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Duke klikuar "Blej tani", ju pajtoheni me kushtet e shërbimit dhe politikën e privatësisë.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
