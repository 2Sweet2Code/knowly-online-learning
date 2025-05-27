import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { CourseApplications } from '@/components/dashboard/CourseApplications';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ManageCourseApplications = () => {
  const { courseId } = useParams<{ courseId?: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // If no user is logged in or user is not an instructor
  if (!user || user.user_metadata?.role !== 'instructor') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Akses i kufizuar</h2>
          <p className="text-gray-600 mb-6">
            Ju nuk keni leje për të parë këtë faqe.
          </p>
          <Button onClick={() => navigate('/')}>Kthehu në Faqen Kryesore</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => courseId ? navigate(`/courses/${courseId}`) : navigate('/dashboard/instructor')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        {courseId ? 'Kthehu te Kursi' : 'Kthehu te Pultet'}
      </Button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {courseId ? 'Menaxho Aplikimet e Kursit' : 'Të Gjitha Aplikimet'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {courseId 
            ? 'Shiko dhe menaxho aplikimet për këtë kurs.'
            : 'Shiko dhe menaxho të gjitha aplikimet për kurset e tua.'}
        </p>
      </div>
      
      <CourseApplications courseId={courseId} />
    </div>
  );
};

export default ManageCourseApplications;
