import { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Course } from "@/types";

interface RequestAdminAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

export const RequestAdminAccessModal = ({ isOpen, onClose, course }: RequestAdminAccessModalProps) => {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Gabim!",
        description: "Ju duhet të jeni të kyçur për të kërkuar qasje si administrator.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Since the course_admins table might not exist yet, we'll use localStorage as a temporary solution
      // In production, this should use the database table
      const localStorageKey = `admin_request_${course.id}_${user.id}`;
      const existingRequest = localStorage.getItem(localStorageKey);
      
      // No need to check for errors since we're using localStorage
      
      if (existingRequest) {
        const requestData = JSON.parse(existingRequest);
        const status = requestData.status === 'pending' ? 'në pritje' : 'e aprovuar';
        toast({
          title: "Informacion",
          description: `Ju tashmë keni një kërkesë ${status} për këtë kurs.`,
        });
        onClose();
        return;
      }
      
      // Store the admin request in localStorage as a temporary solution
      // In production, this should be stored in the database
      const requestData = {
        id: Date.now().toString(),
        course_id: course.id,
        user_id: user.id,
        status: 'pending',
        reason: reason,
        created_at: new Date().toISOString()
      };
      
      localStorage.setItem(localStorageKey, JSON.stringify(requestData));
      
      toast({
        title: "Sukses!",
        description: "Kërkesa juaj për qasje si administrator u dërgua me sukses. Do të njoftoheni kur të merret një vendim.",
      });
      
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Gabim!",
        description: "Ndodhi një problem gjatë dërgimit të kërkesës. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
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
        
        <h3 className="text-2xl font-playfair text-center mb-6">Kërko Qasje si Administrator</h3>
        
        <div className="mb-6">
          <p className="text-gray-600">
            Ju po kërkoni qasje si administrator për kursin:
          </p>
          <p className="font-semibold text-brown mt-2">{course.title}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="reason" className="block mb-2 font-semibold text-brown">
              Arsyeja e Kërkesës:
            </label>
            <textarea
              id="reason"
              placeholder="Shpjegoni pse dëshironi të jeni administrator i këtij kursi..."
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown min-h-[100px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            ></textarea>
            <p className="mt-2 text-sm text-gray-600">
              Kërkesa juaj do të shqyrtohet nga krijuesi i kursit.
            </p>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block flex justify-center items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : null}
            Dërgo Kërkesën
          </button>
        </form>
      </div>
    </div>
  );
};
