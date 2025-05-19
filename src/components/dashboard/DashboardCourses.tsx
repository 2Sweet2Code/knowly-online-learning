import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../../context/AuthContext";
import { Course } from "../../types";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ManageCourseAdminsModal } from "../modals/ManageCourseAdminsModal";
import { EditCourseModal } from "../modals/EditCourseModal";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Edit, Trash2, Users, Eye, EyeOff, BookOpen, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardCoursesProps {
  onCreateCourseClick?: () => void;
}

export const DashboardCourses = ({ onCreateCourseClick }: DashboardCoursesProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const { data: courses = [], isLoading, isError, error } = useQuery<Course[], Error>({
    queryKey: ['instructorCourses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', user.id);
      
      if (error) {
        console.error("Error fetching courses:", error);
        throw error;
      }
      
      if (!data) return [];
      
      return data.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        image: course.image,
        category: course.category as 'programim' | 'dizajn' | 'marketing' | 'other',
        instructor: course.instructor,
        instructorId: course.instructor_id,
        students: course.students || 0,
        status: course.status as 'active' | 'draft',
        price: course.price || 0,
        isPaid: !!course.isPaid,
        accessCode: course.accessCode,
        created_at: course.created_at,
        updated_at: course.updated_at
      }));
    },
    enabled: !!user,
    retry: 1,
    retryDelay: 1000
  });
  
  const handleDeleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['instructorCourses', user?.id] });
      
      toast({
        title: "Sukses",
        description: "Kursi u fshi me sukses.",
      });
      
      setIsDeleteDialogOpen(false);
    } catch (error: unknown) {
      console.error("Failed to delete course", error);
      toast({
        title: "Gabim",
        description: "Ndodhi një gabim gjatë fshirjes së kursit. Ju lutemi provoni përsëri.",
        variant: "destructive",
      });
    }
  };

  const handleManageCourse = (courseId: string) => {
    navigate(`/courses/${courseId}`);
  };
  
  const handleEditCourse = (course: Course) => {
    setSelectedCourse(course);
    setIsEditModalOpen(true);
  };
  
  const handleConfirmDelete = (courseId: string) => {
    setSelectedCourseId(courseId);
    setIsDeleteDialogOpen(true);
  };
  
  const handleToggleCourseStatus = async (course: Course) => {
    try {
      const newStatus = course.status === 'active' ? 'draft' : 'active';
      
      const { error } = await supabase
        .from('courses')
        .update({ status: newStatus })
        .eq('id', course.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['instructorCourses', user?.id] });
      
      toast({
        title: "Sukses",
        description: `Kursi u ${newStatus === 'active' ? 'aktivizua' : 'çaktivizua'} me sukses.`,
      });
    } catch (error) {
      console.error("Failed to update course status", error);
      toast({
        title: "Gabim",
        description: "Ndodhi një gabim gjatë përditësimit të statusit të kursit.",
        variant: "destructive",
      });
    }
  };
  
  const handleManageAdmins = (courseId: string) => {
    setSelectedCourseId(courseId);
    setIsAdminModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brown border-r-transparent" role="status">
          <span className="sr-only">Po ngarkohet...</span>
        </div>
        <p className="mt-2 text-brown">Po ngarkohen kurset...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg p-6">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
        <h4 className="text-lg font-semibold text-red-700 mb-2">Gabim gjatë ngarkimit të kurseve</h4>
        <p className="text-red-600 mb-4">
          {error?.message || "Ndodhi një gabim i papritur. Ju lutemi provoni përsëri më vonë."}
        </p>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={() => queryClient.refetchQueries({ queryKey: ['instructorCourses', user?.id] })}
        >
          Provo Përsëri
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Kurset e Mia
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Lista e Kurseve që Menaxhoni
        </h4>
        
        {courses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-cream">
                <tr>
                  <th className="border border-lightGray p-3 text-left">Titulli i Kursit</th>
                  <th className="border border-lightGray p-3 text-left">Kategoria</th>
                  <th className="border border-lightGray p-3 text-left">Studentë</th>
                  <th className="border border-lightGray p-3 text-left">Çmimi</th>
                  <th className="border border-lightGray p-3 text-left">Statusi</th>
                  <th className="border border-lightGray p-3 text-left">Veprime</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id}>
                    <td className="border border-lightGray p-3">{course.title}</td>
                    <td className="border border-lightGray p-3">
                      {course.category === 'programim' ? 'Programim' : 
                       course.category === 'dizajn' ? 'Dizajn' : 
                       course.category === 'marketing' ? 'Marketing' : 'Tjetër'}
                    </td>
                    <td className="border border-lightGray p-3">{course.students}</td>
                    <td className="border border-lightGray p-3">
                      {course.isPaid ? `${course.price}€` : 'Falas'}
                    </td>
                    <td className="border border-lightGray p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        course.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {course.status === 'active' ? 'Aktiv' : 'Draft'}
                      </span>
                    </td>
                    <td className="border border-lightGray p-3">
                      <div className="flex space-x-2">
                        <button 
                          className="p-1.5 bg-brown text-white rounded hover:bg-brown-dark transition-colors"
                          onClick={() => handleManageCourse(course.id)}
                          title="Shiko Kursin"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                          onClick={() => handleEditCourse(course)}
                          title="Ndrysho Kursin"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                          onClick={() => navigate(`/dashboard/courses/${course.id}/lessons`)}
                          title="Menaxho Leksionet"
                        >
                          <BookOpen size={16} />
                        </button>
                        <button 
                          className="p-1.5 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
                          onClick={() => handleManageAdmins(course.id)}
                          title="Menaxho Administratorët"
                        >
                          <Users size={16} />
                        </button>
                        <button 
                          className="p-1.5 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                          onClick={() => handleToggleCourseStatus(course)}
                          title={course.status === 'active' ? 'Çaktivizo Kursin' : 'Aktivizo Kursin'}
                        >
                          {course.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button 
                          className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          onClick={() => handleConfirmDelete(course.id)}
                          title="Fshij Kursin"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 px-4 bg-gray-50 rounded-md border border-gray-200">
            <p className="text-gray-600">Nuk keni krijuar asnjë kurs ende.</p>
          </div>
        )}
      </div>
      
      {selectedCourse && (
        <EditCourseModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          course={selectedCourse}
        />
      )}
      
      {selectedCourseId && (
        <ManageCourseAdminsModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          courseId={selectedCourseId}
        />
      )}
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Jeni absolutisht i sigurt?</AlertDialogTitle>
            <AlertDialogDescription>
              Ky veprim nuk mund të zhbëhet. Kjo do të fshijë përgjithmonë kursin 
              dhe të gjitha të dhënat e lidhura me të nga serverët tanë.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulo</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedCourseId && handleDeleteCourse(selectedCourseId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Po, Fshije Kursin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
