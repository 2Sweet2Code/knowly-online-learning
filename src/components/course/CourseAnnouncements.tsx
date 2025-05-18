import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Megaphone, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS as en, sq } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { AnnouncementModal } from '../dashboard/AnnouncementModal';
import { useState, useEffect } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  instructor_name: string;
  course_id: string;
}

interface CourseAnnouncementsProps {
  courseId: string;
  isInstructor: boolean;
}

export const CourseAnnouncements = ({ courseId, isInstructor }: CourseAnnouncementsProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  const fetchAnnouncements = async (): Promise<Announcement[]> => {
    if (!courseId) return [];
    
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  };

  const {
    data: announcementsData,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<Announcement[], Error>({
    queryKey: ['courseAnnouncements', courseId],
    queryFn: fetchAnnouncements,
    enabled: !!courseId,
    refetchOnWindowFocus: false
  });

  // Ensure announcements is always an array and properly typed
  const announcements: Announcement[] = announcementsData || [];

  useEffect(() => {
    if (isError) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë ngarkimit të njoftimeve.',
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { 
      addSuffix: true,
      locale: document.documentElement.lang === 'sq' ? sq : en 
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-brown" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">Ndodhi një gabim gjatë ngarkimit të njoftimeve.</p>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          className="flex items-center mx-auto"
        >
          <Loader2 className="h-4 w-4 mr-2" />
          Provoni përsëri
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Njoftimet</h2>
        {isInstructor && (
          <Button 
            onClick={() => setIsAnnouncementModalOpen(true)}
            className="bg-brown hover:bg-brown/90"
          >
            <Megaphone className="h-4 w-4 mr-2" />
            Krijo Njoftim
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="bg-cream/50 rounded-lg p-8 text-center">
          <Megaphone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nuk ka njoftime</h3>
          <p className="text-gray-600 mb-4">Nuk ka njoftime për këtë kurs ende.</p>
          {isInstructor && (
            <Button 
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="bg-brown hover:bg-brown/90"
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Krijo Njoftimin e Parë
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{announcement.title}</h3>
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <span>{announcement.instructor_name}</span>
                    <span className="mx-2">•</span>
                    <div className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {formatDate(announcement.created_at)}
                    </div>
                  </div>
                  <div 
                    className="prose max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: announcement.content }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnnouncementModal 
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        courseId={courseId}
      />
    </div>
  );
};
