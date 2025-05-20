import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Edit, Trash2, ArrowUp, ArrowDown, Video, FileText, Link, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  content_type: "video" | "text" | "link";
  content_url: string;
  order_index: number;
  created_at: string;
}

// Helper functions for localStorage
const getLessonsFromLocalStorage = (courseId: string): Lesson[] => {
  try {
    const lessonsJson = localStorage.getItem(`lessons_${courseId}`);
    return lessonsJson ? JSON.parse(lessonsJson) : [];
  } catch (error) {
    console.error('Error retrieving lessons from localStorage:', error);
    return [];
  }
};

const saveLessonsToLocalStorage = (courseId: string, lessons: Lesson[]) => {
  try {
    localStorage.setItem(`lessons_${courseId}`, JSON.stringify(lessons));
  } catch (error) {
    console.error('Error saving lessons to localStorage:', error);
  }
};

export const DashboardCourseLessons = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [isAddLessonModalOpen, setIsAddLessonModalOpen] = useState(false);
  const [isEditLessonModalOpen, setIsEditLessonModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // Form state for adding/editing lessons
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<"video" | "text" | "link">("video");
  const [contentUrl, setContentUrl] = useState("");
  
  // Fetch course details
  const { data: course, isLoading: isLoadingCourse, isError: isCourseError } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
          
        if (error) {
          console.error('Error fetching course:', error);
          return null;
        }
        return data;
      } catch (err) {
        console.error('Exception fetching course:', err);
        return null;
      }
    },
    enabled: !!courseId && !!user,
    retry: 1
  });
  
  // Fetch lessons for the course (using localStorage as a temporary solution)
  const { data: lessons = [], isLoading: isLoadingLessons } = useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      // In a production environment, this would fetch from a database table
      // Since the lessons table might not exist yet, we'll use localStorage
      const lessons = getLessonsFromLocalStorage(courseId!);
      return lessons;
    },
    enabled: !!courseId && !!user
  });
  
  // Add lesson mutation
  const addLessonMutation = useMutation({
    mutationFn: async (newLesson: Omit<Lesson, 'id' | 'created_at'>) => {
      // In a production environment, this would insert into a database table
      // Since the lessons table might not exist yet, we'll use localStorage
      const existingLessons = getLessonsFromLocalStorage(courseId!);
      
      const lesson: Lesson = {
        ...newLesson,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      };
      
      const updatedLessons = [...existingLessons, lesson];
      saveLessonsToLocalStorage(courseId!, updatedLessons);
      
      return lesson;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      toast({
        title: "Sukses!",
        description: "Leksioni u shtua me sukses.",
      });
      resetForm();
      setIsAddLessonModalOpen(false);
    },
    onError: (error) => {
      console.error("Error adding lesson:", error);
      toast({
        title: "Gabim",
        description: "Ndodhi një gabim gjatë shtimit të leksionit. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    }
  });
  
  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: async (updatedLesson: Partial<Lesson> & { id: string }) => {
      // In a production environment, this would update a database table
      // Since the lessons table might not exist yet, we'll use localStorage
      const existingLessons = getLessonsFromLocalStorage(courseId!);
      
      const updatedLessons = existingLessons.map(lesson => 
        lesson.id === updatedLesson.id ? { ...lesson, ...updatedLesson } : lesson
      );
      
      saveLessonsToLocalStorage(courseId!, updatedLessons);
      
      return updatedLessons.find(lesson => lesson.id === updatedLesson.id)!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      toast({
        title: "Sukses!",
        description: "Leksioni u përditësua me sukses.",
      });
      resetForm();
      setIsEditLessonModalOpen(false);
    },
    onError: (error) => {
      console.error("Error updating lesson:", error);
      toast({
        title: "Gabim",
        description: "Ndodhi një gabim gjatë përditësimit të leksionit. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    }
  });
  
  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      // In a production environment, this would delete from a database table
      // Since the lessons table might not exist yet, we'll use localStorage
      const existingLessons = getLessonsFromLocalStorage(courseId!);
      
      const updatedLessons = existingLessons.filter(lesson => lesson.id !== lessonId);
      saveLessonsToLocalStorage(courseId!, updatedLessons);
      
      return lessonId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
      toast({
        title: "Sukses!",
        description: "Leksioni u fshi me sukses.",
      });
    },
    onError: (error) => {
      console.error("Error deleting lesson:", error);
      toast({
        title: "Gabim",
        description: "Ndodhi një gabim gjatë fshirjes së leksionit. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    }
  });
  
  // Reorder lesson mutation
  const reorderLessonMutation = useMutation({
    mutationFn: async ({ lessonId, newIndex }: { lessonId: string; newIndex: number }) => {
      // Get the lesson to move
      const existingLessons = getLessonsFromLocalStorage(courseId!);
      const lessonToMove = existingLessons.find(lesson => lesson.id === lessonId);
      if (!lessonToMove) throw new Error("Lesson not found");
      
      // Update other lessons' order_index if needed
      const updatedLessons = existingLessons.map(lesson => {
        if (lesson.id === lessonId) {
          return { ...lesson, order_index: newIndex };
        }
        
        // If moving down, decrement lessons between old and new position
        if (lessonToMove.order_index < newIndex && 
            lesson.order_index > lessonToMove.order_index && 
            lesson.order_index <= newIndex) {
          return { ...lesson, order_index: lesson.order_index - 1 };
        }
        
        // If moving up, increment lessons between new and old position
        if (lessonToMove.order_index > newIndex && 
            lesson.order_index < lessonToMove.order_index && 
            lesson.order_index >= newIndex) {
          return { ...lesson, order_index: lesson.order_index + 1 };
        }
        
        return lesson;
      });
      
      // Save to localStorage
      saveLessonsToLocalStorage(courseId!, updatedLessons);
      
      return updatedLessons;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lessons', courseId] });
    },
    onError: (error) => {
      console.error("Error reordering lesson:", error);
      toast({
        title: "Gabim",
        description: "Ndodhi një gabim gjatë rirenditjes së leksionit. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    }
  });
  
  // Handle moving lesson up
  const handleMoveUp = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson || lesson.order_index === 0) return;
    
    reorderLessonMutation.mutate({
      lessonId,
      newIndex: lesson.order_index - 1
    });
  };
  
  // Handle moving lesson down
  const handleMoveDown = (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson || lesson.order_index === lessons.length - 1) return;
    
    reorderLessonMutation.mutate({
      lessonId,
      newIndex: lesson.order_index + 1
    });
  };
  
  // Reset form fields
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setContentType("video");
    setContentUrl("");
    setSelectedLesson(null);
  };
  
  // Open edit lesson modal
  const openEditLessonModal = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setTitle(lesson.title);
    setDescription(lesson.description);
    setContentType(lesson.content_type);
    setContentUrl(lesson.content_url);
    setIsEditLessonModalOpen(true);
  };
  
  // Handle add lesson form submission
  const handleAddLesson = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !contentUrl.trim()) {
      toast({
        title: "Gabim",
        description: "Ju lutemi plotësoni të gjitha fushat e kërkuara.",
        variant: "destructive",
      });
      return;
    }
    
    addLessonMutation.mutate({
      course_id: courseId!,
      title: title.trim(),
      description: description.trim(),
      content_type: contentType,
      content_url: contentUrl.trim(),
      order_index: lessons.length // Add to the end
    });
  };
  
  // Handle edit lesson form submission
  const handleEditLesson = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedLesson) return;
    
    if (!title.trim() || !contentUrl.trim()) {
      toast({
        title: "Gabim",
        description: "Ju lutemi plotësoni të gjitha fushat e kërkuara.",
        variant: "destructive",
      });
      return;
    }
    
    updateLessonMutation.mutate({
      id: selectedLesson.id,
      title: title.trim(),
      description: description.trim(),
      content_type: contentType,
      content_url: contentUrl.trim()
    });
  };
  
  // Handle delete lesson
  const handleDeleteLesson = (lessonId: string) => {
    if (window.confirm("A jeni të sigurt që dëshironi të fshini këtë leksion? Ky veprim nuk mund të kthehet.")) {
      deleteLessonMutation.mutate(lessonId);
    }
  };
  
  // Get content type icon
  const getContentTypeIcon = (type: "video" | "text" | "link") => {
    switch (type) {
      case "video":
        return <Video size={16} className="text-blue-500" />;
      case "text":
        return <FileText size={16} className="text-green-500" />;
      case "link":
        return <Link size={16} className="text-purple-500" />;
      default:
        return null;
    }
  };
  
  if (isLoadingCourse) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brown" />
        <span className="ml-2">Po ngarkohet kursi...</span>
      </div>
    );
  }
  
  if (isCourseError || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">Ndodhi një gabim gjatë ngarkimit të kursit.</div>
        <button 
          className="btn btn-primary flex items-center"
          onClick={() => navigate('/dashboard/courses')}
        >
          <ArrowLeft size={18} className="mr-2" />
          Kthehu tek Kurset
        </button>
      </div>
    );
  }
  

  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            className="mr-4 p-2 hover:bg-cream rounded-full"
            onClick={() => navigate('/dashboard/courses')}
          >
            <ArrowLeft size={20} />
          </button>
          <h3 className="text-2xl font-playfair pb-3 border-b border-lightGray">
            Menaxho Leksionet: {course?.title || 'Kursi'}
          </h3>
        </div>
        <button 
          className="btn btn-primary flex items-center"
          onClick={() => setIsAddLessonModalOpen(true)}
        >
          <PlusCircle size={18} className="mr-2" />
          Shto Leksion
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        {isLoadingLessons ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-brown" />
            <span className="ml-2">Po ngarkohen leksionet...</span>
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-lg text-gray-600">Nuk ka leksione për këtë kurs ende.</p>
            <button 
              className="btn btn-primary mt-4 flex items-center mx-auto"
              onClick={() => setIsAddLessonModalOpen(true)}
            >
              <PlusCircle size={18} className="mr-2" />
              Shto Leksionin e Parë
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson, index) => (
              <div 
                key={lesson.id} 
                className="p-4 border border-lightGray rounded-md bg-cream/50 flex justify-between items-start"
              >
                <div className="flex items-start">
                  <div className="mr-4 flex flex-col items-center space-y-1">
                    <button 
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleMoveUp(lesson.id)}
                      disabled={index === 0}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <span className="text-sm font-bold">{index + 1}</span>
                    <button 
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleMoveDown(lesson.id)}
                      disabled={index === lessons.length - 1}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  <div>
                    <div className="flex items-center">
                      {getContentTypeIcon(lesson.content_type)}
                      <h5 className="font-bold ml-2">{lesson.title}</h5>
                    </div>
                    {lesson.description && (
                      <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      Lloji: {lesson.content_type === "video" ? "Video" : lesson.content_type === "text" ? "Tekst" : "Lidhje"}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="p-2 hover:bg-gray-200 rounded"
                    onClick={() => openEditLessonModal(lesson)}
                  >
                    <Edit size={16} className="text-brown" />
                  </button>
                  <button 
                    className="p-2 hover:bg-gray-200 rounded"
                    onClick={() => handleDeleteLesson(lesson.id)}
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add Lesson Modal */}
      <Dialog open={isAddLessonModalOpen} onOpenChange={setIsAddLessonModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-playfair">Shto Leksion të Ri</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleAddLesson} className="space-y-4 mt-4">
            <div className="mb-4">
              <label htmlFor="title" className="block mb-2 font-semibold text-brown">
                Titulli i Leksionit:
              </label>
              <input
                type="text"
                id="title"
                placeholder="p.sh., Hyrje në HTML"
                className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block mb-2 font-semibold text-brown">
                Përshkrimi (Opsional):
              </label>
              <textarea
                id="description"
                placeholder="Përshkruani leksionin..."
                className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="content-type" className="block mb-2 font-semibold text-brown">
                Lloji i Përmbajtjes:
              </label>
              <select
                id="content-type"
                className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as "video" | "text" | "link")}
                required
              >
                <option value="video">Video</option>
                <option value="text">Tekst</option>
                <option value="link">Lidhje</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="content-url" className="block mb-2 font-semibold text-brown">
                {contentType === "video" ? "URL e Videos:" : 
                 contentType === "text" ? "Përmbajtja e Tekstit:" : "URL e Lidhjes:"}
              </label>
              {contentType === "text" ? (
                <textarea
                  id="content-url"
                  placeholder="Shkruani përmbajtjen e leksionit këtu..."
                  className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown h-32"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  required
                />
              ) : (
                <input
                  type="url"
                  id="content-url"
                  placeholder={contentType === "video" ? "https://www.youtube.com/watch?v=..." : "https://example.com/resource"}
                  className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  required
                />
              )}
            </div>
            
            <DialogFooter>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  resetForm();
                  setIsAddLessonModalOpen(false);
                }}
                disabled={addLessonMutation.isPending}
              >
                Anulo
              </button>
              <button 
                type="submit" 
                className="btn btn-primary flex justify-center items-center"
                disabled={addLessonMutation.isPending}
              >
                {addLessonMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Duke shtuar...
                  </>
                ) : (
                  "Shto Leksion"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Lesson Modal */}
      <Dialog open={isEditLessonModalOpen} onOpenChange={setIsEditLessonModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-playfair">Ndrysho Leksionin</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleEditLesson} className="space-y-4 mt-4">
            <div className="mb-4">
              <label htmlFor="edit-title" className="block mb-2 font-semibold text-brown">
                Titulli i Leksionit:
              </label>
              <input
                type="text"
                id="edit-title"
                placeholder="p.sh., Hyrje në HTML"
                className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="edit-description" className="block mb-2 font-semibold text-brown">
                Përshkrimi (Opsional):
              </label>
              <textarea
                id="edit-description"
                placeholder="Përshkruani leksionin..."
                className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown h-24"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="edit-content-type" className="block mb-2 font-semibold text-brown">
                Lloji i Përmbajtjes:
              </label>
              <select
                id="edit-content-type"
                className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as "video" | "text" | "link")}
                required
              >
                <option value="video">Video</option>
                <option value="text">Tekst</option>
                <option value="link">Lidhje</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label htmlFor="edit-content-url" className="block mb-2 font-semibold text-brown">
                {contentType === "video" ? "URL e Videos:" : 
                 contentType === "text" ? "Përmbajtja e Tekstit:" : "URL e Lidhjes:"}
              </label>
              {contentType === "text" ? (
                <textarea
                  id="edit-content-url"
                  placeholder="Shkruani përmbajtjen e leksionit këtu..."
                  className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown h-32"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  required
                />
              ) : (
                <input
                  type="url"
                  id="edit-content-url"
                  placeholder={contentType === "video" ? "https://www.youtube.com/watch?v=..." : "https://example.com/resource"}
                  className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  required
                />
              )}
            </div>
            
            <DialogFooter>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => {
                  resetForm();
                  setIsEditLessonModalOpen(false);
                }}
                disabled={updateLessonMutation.isPending}
              >
                Anulo
              </button>
              <button 
                type="submit" 
                className="btn btn-primary flex justify-center items-center"
                disabled={updateLessonMutation.isPending}
              >
                {updateLessonMutation.isPending ? (
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
    </div>
  );
};
