import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateCourseModal = ({ isOpen, onClose, onSuccess }: CreateCourseModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<number | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [allowAdminApplications, setAllowAdminApplications] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: existingCategories = [] } = useQuery<string[], Error>({
    queryKey: ['distinctCourseCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('category');
      
      if (error) {
        console.error("Error fetching distinct categories:", error);
        return [];
      }
      const categories = data?.map(item => item.category).filter(Boolean) as string[] || [];
      return [...new Set(categories)];
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Gabim!",
        description: "Ju duhet të jeni të kyçur për të krijuar një kurs.",
        variant: "destructive",
      });
      return;
    }

    if (!category) {
      toast({
        title: "Gabim!",
        description: "Ju lutemi zgjidhni ose krijoni një kategori për kursin.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const image = imageUrl || `https://placehold.co/600x360/${encodeURIComponent("#5C4B3A")}/${encodeURIComponent("#F5F0E6")}?text=${encodeURIComponent(title)}`;
      
      // Generate a random access code if none provided
      const courseAccessCode = accessCode || Math.random().toString(36).substring(2, 8).toUpperCase();
      
      let categoryToSave = '';
      if (category === '__addNew__') {
        if (!newCategoryName.trim()) {
          toast({
            title: "Gabim!",
            description: "Ju lutemi shkruani emrin e kategorisë së re.",
            variant: "destructive",
          });
          return;
        }
        categoryToSave = newCategoryName.trim();
      } else {
        categoryToSave = category;
      }

      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: title.trim(),
          description,
          category: categoryToSave,
          image,
          instructor: user.name,
          instructor_id: user.id,
          status: 'draft',
          students: 0,
          price: isPaid ? Number(price) : null,
          isPaid: isPaid,
          accessCode: courseAccessCode,
          allow_admin_applications: allowAdminApplications
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Enroll the instructor in their own course
      if (data && data.id) {
        await supabase
          .from('enrollments')
          .insert({
            user_id: user.id,
            course_id: data.id,
            status: 'enrolled',
            enrolled_at: new Date().toISOString()
          });
        
        // Update the student count
        await supabase
          .from('courses')
          .update({ students: 1 })
          .eq('id', data.id);
      }
      
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['instructorCourses', user.id] });
      queryClient.invalidateQueries({ queryKey: ['distinctCourseCategories'] });
      
      toast({
        title: "Sukses!",
        description: "Kursi u krijua me sukses dhe ju jeni regjistruar si instruktor.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        title: "Gabim!",
        description: "Ndodhi një problem gjatë krijimit të kursit. Ju lutemi provoni përsëri.",
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
        
        <h3 className="text-2xl font-playfair text-center mb-6">Krijo Kurs të Ri</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="course-title" className="block mb-2 font-semibold text-brown">
              Titulli i Kursit:
            </label>
            <input
              type="text"
              id="course-title"
              placeholder="p.sh., Hyrje në JavaScript"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="course-category" className="block mb-2 font-semibold text-brown">
              Kategoria:
            </label>
            <select
              id="course-category"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown mb-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required={category !== '__addNew__'}
            >
              <option value="">Zgjidhni Kategorinë...</option>
              {existingCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="__addNew__">Krijo Kategori të Re...</option>
            </select>

            {category === '__addNew__' && (
              <input
                type="text"
                id="new-category-name"
                placeholder="Shkruani emrin e kategorisë së re"
                className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                required
              />
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="course-description" className="block mb-2 font-semibold text-brown">
              Përshkrimi i Kursit:
            </label>
            <textarea
              id="course-description"
              placeholder="Përshkruani shkurtimisht kursin..."
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label htmlFor="course-image" className="block mb-2 font-semibold text-brown">
              URL i Imazhit të Kopertinës (Opsional):
            </label>
            <input
              type="text"
              id="course-image"
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
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
          
          <div className="mb-4">
            <label htmlFor="course-allow-admin-applications" className="flex items-center text-sm font-medium text-gray-700 hover:text-brown cursor-pointer">
              <input
                type="checkbox"
                id="course-allow-admin-applications"
                className="h-4 w-4 text-brown border-lightGray rounded focus:ring-brown mr-2 cursor-pointer"
                checked={allowAdminApplications}
                onChange={(e) => setAllowAdminApplications(e.target.checked)}
              />
              Lejo aplikimet për administratorë për këtë kurs
            </label>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block flex justify-center items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            ) : null}
            Krijo Kursin
          </button>
        </form>
      </div>
    </div>
  );
};
