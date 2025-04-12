import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Course } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface EditCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

export const EditCourseModal = ({ isOpen, onClose, course }: EditCourseModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [category, setCategory] = useState<"programim" | "dizajn" | "marketing" | "other">(
    course.category
  );
  const [imageUrl, setImageUrl] = useState(course.image);
  const [accessCode, setAccessCode] = useState(course.accessCode || "");
  const [isPaid, setIsPaid] = useState(course.isPaid || false);
  const [price, setPrice] = useState<number | "">(course.price || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update state when course prop changes
    setTitle(course.title);
    setDescription(course.description);
    setCategory(course.category);
    setImageUrl(course.image);
    setAccessCode(course.accessCode || "");
    setIsPaid(course.isPaid || false);
    setPrice(course.price || "");
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Gabim",
        description: "Ju duhet të jeni të kyçur për të ndryshuar kursin.",
        variant: "destructive",
      });
      return;
    }
    
    if (!title.trim() || !description.trim() || !category || !imageUrl.trim()) {
      toast({
        title: "Gabim",
        description: "Ju lutemi plotësoni të gjitha fushat e kërkuara.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Format course title with access code if provided
      const courseTitle = accessCode 
        ? `${title.trim()} [${accessCode}]` 
        : title.trim();
      
      // Update course in Supabase
      const { data, error } = await supabase
        .from('courses')
        .update({
          title: courseTitle,
          description,
          category,
          image: imageUrl,
          price: isPaid ? Number(price) : null,
          isPaid: isPaid,
          accessCode: accessCode || null
        })
        .eq('id', course.id)
        .select()
        .single();
      
      if (error) {
        console.error("Error updating course:", error);
        throw error;
      }
      
      // Invalidate and refetch courses
      queryClient.invalidateQueries({ queryKey: ['instructorCourses', user.id] });
      
      toast({
        title: "Sukses!",
        description: "Kursi u përditësua me sukses.",
      });
      
      onClose();
    } catch (error) {
      console.error("Failed to update course:", error);
      toast({
        title: "Gabim",
        description: "Ndodhi një gabim gjatë përditësimit të kursit. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-playfair">Ndrysho Kursin</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="mb-4">
            <label htmlFor="title" className="block mb-2 font-semibold text-brown">
              Titulli i Kursit:
            </label>
            <input
              type="text"
              id="title"
              placeholder="p.sh., Hyrje në Programim"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block mb-2 font-semibold text-brown">
              Përshkrimi:
            </label>
            <textarea
              id="description"
              placeholder="Përshkruani kursin tuaj..."
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown h-32"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="category" className="block mb-2 font-semibold text-brown">
              Kategoria:
            </label>
            <select
              id="category"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={category}
              onChange={(e) => setCategory(e.target.value as "programim" | "dizajn" | "marketing" | "other")}
              required
            >
              <option value="">Zgjidhni kategorinë</option>
              <option value="programim">Programim</option>
              <option value="dizajn">Dizajn</option>
              <option value="marketing">Marketing</option>
              <option value="other">Tjetër</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label htmlFor="image-url" className="block mb-2 font-semibold text-brown">
              URL e Imazhit:
            </label>
            <input
              type="url"
              id="image-url"
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="access-code" className="block mb-2 font-semibold text-brown">
              Kodi i Hyrjes (Opsional):
            </label>
            <div className="flex items-center">
              <input
                type="text"
                id="access-code"
                placeholder="p.sh., ABC123"
                className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                maxLength={8}
              />
              <div className="ml-2 text-xs text-gray-500">
                <span className="block">Lihet bosh për kod të rastësishëm</span>
                <span className="block">Studentët kanë nevojë për këtë kod për t'u regjistruar</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="is-paid"
                className="mr-2 h-4 w-4 text-brown focus:ring-brown border-lightGray rounded"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
              />
              <label htmlFor="is-paid" className="font-semibold text-brown">
                Kurs me pagesë
              </label>
            </div>
            {isPaid && (
              <div className="mt-2">
                <label htmlFor="course-price" className="block mb-2 font-semibold text-brown">
                  Çmimi (EUR):
                </label>
                <input
                  type="number"
                  id="course-price"
                  placeholder="p.sh., 49.99"
                  className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
                  value={price}
                  onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                  min="0"
                  step="0.01"
                  required={isPaid}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Anulo
            </button>
            <button 
              type="submit" 
              className="btn btn-primary flex justify-center items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Duke përditësuar...
                </>
              ) : (
                "Ruaj Ndryshimet"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
