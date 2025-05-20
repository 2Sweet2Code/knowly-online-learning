import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';

interface Course {
  id: string;
  title: string;
}

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId?: string | null;
}

interface FormErrors {
  title?: string;
  content?: string;
  course?: string;
}

export const AnnouncementModal = ({ isOpen, onClose, courseId }: AnnouncementModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(courseId || null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  // Fetch courses when the modal opens
  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.id) return;
      
      setIsLoadingCourses(true);
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title')
          .eq('instructor_id', user.id)
          .order('title');
          
        if (error) throw error;
        
        setCourses(data || []);
        
        // If there's only one course and no course is selected, select it by default
        if (data?.length === 1 && !selectedCourseId) {
          setSelectedCourseId(data[0].id);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
        toast({
          title: 'Gabim',
          description: 'Ndodhi një gabim gjatë ngarkimit të kurseve.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingCourses(false);
      }
    };
    
    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen, user?.id, selectedCourseId, toast]);
  
  // Reset form when modal is closed
  useEffect(() => {
    if (!isOpen) {
      // Small delay to allow for the closing animation
      const timer = setTimeout(() => {
        setTitle('');
        setContent('');
        setErrors({});
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Titulli është i detyrueshëm';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Titulli duhet të jetë të paktën 5 karaktere';
    }

    if (!content.trim()) {
      newErrors.content = 'Përmbajtja është e detyrueshme';
    } else if (content.trim().length < 10) {
      newErrors.content = 'Përmbajtja duhet të jetë të paktën 10 karaktere';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!selectedCourseId && courses.length > 0) {
      setErrors(prev => ({
        ...prev,
        course: 'Ju lutem zgjidhni një kurs'
      }));
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Gabim',
        description: 'Nuk jeni i kyqur si përdorues.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('course_announcements')
        .insert([
          {
            title: title.trim(),
            content: content.trim(),
            course_id: selectedCourseId,
            created_by: user.id,
            is_pinned: false
          }
        ]);

      if (error) throw error;

      // Invalidate the announcements query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['courseAnnouncements', selectedCourseId] });
      queryClient.invalidateQueries({ queryKey: ['recentAnnouncements'] });

      toast({
        title: 'Sukses',
        description: 'Njoftimi u shtua me sukses!',
      });

      // Close the modal
      onClose();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë krijimit të njoftimit.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Krijo Njoftim të Ri
          </DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Mbyll</span>
          </button>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {isLoadingCourses ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-brown" />
            </div>
          ) : courses.length > 0 ? (
            <div>
              <label htmlFor="course" className="block text-sm font-medium text-gray-700 mb-1">
                Kursi *
              </label>
              <select
                id="course"
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(e.target.value || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent"
              >
                <option value="">Zgjidh një kurs</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              {errors.course && <p className="mt-1 text-sm text-red-600">{errors.course}</p>}
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Nuk keni asnjë kurs aktiv. Ju duhet të krijoni së pari një kurs para se të publikoni njoftime.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Titulli *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent"
              placeholder="Shkruaj titullin e njoftimit"
              disabled={isLoading || courses.length === 0}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Përmbajtja *
            </label>
            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent"
              placeholder="Shkruaj përmbajtjen e njoftimit..."
              disabled={isLoading || courses.length === 0}
            />
            <p className="mt-1 text-xs text-gray-500">
              Përmbajtja mund të përmbajë formatim të thjeshtë HTML si &lt;b&gt;, &lt;i&gt;, &lt;a&gt;.
            </p>
            {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
          </div>

          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brown disabled:opacity-50"
              disabled={isLoading}
            >
              Anulo
            </button>
            <button
              type="submit"
              className="ml-3 inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-brown border border-transparent rounded-md shadow-sm hover:bg-brown/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brown disabled:opacity-50"
              disabled={isLoading || courses.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Po publikoj...
                </>
              ) : (
                'Publiko Njoftimin'
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
