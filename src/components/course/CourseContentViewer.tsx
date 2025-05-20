import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Link as LinkIcon, File, Video, BookOpen, Download, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { CourseContent } from '@/types/course-content';

const CONTENT_ICONS = {
  file: <File className="h-5 w-5" />,
  link: <LinkIcon className="h-5 w-5" />,
  text: <FileText className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  assignment: <BookOpen className="h-5 w-5" />,
};

export function CourseContentViewer() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<CourseContent[]>([]);
  const [selectedContent, setSelectedContent] = useState<CourseContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isCheckingEnrollment, setIsCheckingEnrollment] = useState(true);
  
  // Check if user is enrolled in the course
  useEffect(() => {
    const checkEnrollment = async () => {
      if (!courseId || !user?.id) {
        setIsEnrolled(false);
        setIsCheckingEnrollment(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId)
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw error;
        }


        setIsEnrolled(!!data);
      } catch (error) {
        console.error('Error checking enrollment:', error);
        toast({
          title: 'Gabim',
          description: 'Ndodhi një gabim gjatë verifikimit të regjistrimit në kurs.',
          variant: 'destructive',
        });
        setIsEnrolled(false);
      } finally {
        setIsCheckingEnrollment(false);
      }
    };

    checkEnrollment();
  }, [courseId, user?.id]);
  
  // Fetch course content
  useEffect(() => {
    if (!courseId || !user?.id || isCheckingEnrollment) return;

    const fetchContent = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('course_content')
          .select('*')
          .eq('course_id', courseId);

        // Only show published content if user is not an instructor
        if (user.role !== 'instructor' && user.role !== 'admin') {
          query = query.eq('is_published', true);
        }

        // If user is not enrolled, only show preview content
        if (!isEnrolled) {
          query = query.eq('is_preview', true);
        }

        const { data, error } = await query.order('position', { ascending: true });

        if (error) throw error;
        
        const contentData = data as CourseContent[];
        setContent(contentData);
        
        // Select first content by default if available
        if (contentData.length > 0) {
          setSelectedContent(contentData[0]);
        }
      } catch (error) {
        console.error('Error fetching course content:', error);
        toast({
          title: 'Gabim',
          description: 'Ndodhi një gabim gjatë ngarkimit të përmbajtjes së kursit.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [courseId, isEnrolled, isCheckingEnrollment, user?.id, user?.role]);
  
  const renderContent = () => {
    if (!selectedContent) return null;

    switch (selectedContent.content_type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: selectedContent.content_url || '' }} />
          </div>
        );
      
      case 'file':
        return (
          <div className="text-center">
            <File className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{selectedContent.title}</h2>
            {selectedContent.description && (
              <p className="text-gray-600 mb-6">{selectedContent.description}</p>
            )}
            <Button asChild>
              <a 
                href={selectedContent.content_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Shkarko Skedarin
              </a>
            </Button>
          </div>
        );
      
      case 'video':
        return (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{selectedContent.title}</h1>
            {selectedContent.description && (
              <p className="text-gray-600">{selectedContent.description}</p>
            )}
            <div className="aspect-w-16 aspect-h-9">
              <video 
                src={selectedContent.content_url || ''} 
                controls 
                className="w-full rounded-lg"
              >
                Shfletuesi juaj nuk e mbështet etiketën video.
              </video>
            </div>
          </div>
        );
      
      case 'link':
        return (
          <div className="text-center">
            <LinkIcon className="mx-auto h-16 w-16 text-blue-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">{selectedContent.title}</h2>
            {selectedContent.description && (
              <p className="text-gray-600 mb-6">{selectedContent.description}</p>
            )}
            <Button asChild>
              <a 
                href={selectedContent.content_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                Hap Lidhjen
              </a>
            </Button>
          </div>
        );
      
      case 'assignment':
        return (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{selectedContent.title}</h1>
            {selectedContent.description && (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedContent.description }} />
              </div>
            )}
            {selectedContent.content_url && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-2">Burimet e Detyrës</h3>
                <a 
                  href={selectedContent.content_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Shkarko Detyrën
                </a>
              </div>
            )}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Dërgo Detyrën Tënde</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Përgjigja</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-md p-2 min-h-[100px]"
                    placeholder="Shkruani përgjigjen tuaj këtu ose ngjisni një lidhje..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bashkëngjitni Skedarë</label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="file"
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button>Dërgo Detyrën</Button>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Ky lloj përmbajtjeje nuk mbështetet.</p>
          </div>
        );
    }
  };
  
  if (isLoading || isCheckingEnrollment) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-2" />
        <p className="text-gray-600">Duke ngarkuar përmbajtjen...</p>
      </div>
    );
  }

  // Show enrollment message if user is not enrolled
  if (!isEnrolled) {
    return (
      <div className="text-center py-12 px-4">
        <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nuk jeni të regjistruar në këtë kurs</h3>
        <p className="text-gray-600 mb-6">Ju duhet të regjistroheni në këtë kurs për të parë përmbajtjen e plotë.</p>
        {content.length > 0 && (
          <div className="max-w-2xl mx-auto mt-8">
            <h4 className="text-md font-medium text-gray-900 mb-4">Parashtrim i kursit:</h4>
            <div className="space-y-2">
              {content.map((item) => (
                <div key={item.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="text-blue-500">
                      {CONTENT_ICONS[item.content_type as keyof typeof CONTENT_ICONS] || <FileText className="h-5 w-5" />}
                    </span>
                    <span className="font-medium">{item.title}</span>
                    {item.is_preview && (
                      <span className="ml-auto bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        Shikim i lirë
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-blue-800">Regjistrohuni tani për të pasur qasje në të gjithë përmbajtjen e kursit!</p>
              <Button className="mt-3" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Regjistrohu në Kurs
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  if (content.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Nuk ka përmbajtje të disponueshme</h3>
        <p className="mt-1 text-sm text-gray-500">Instruktori nuk ka shtuar ende asnjë përmbajtje.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar with content list */}
      <div className="md:col-span-1">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Përmbajtja</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
              {content.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedContent(item)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    selectedContent?.id === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-gray-700 hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">
                      {CONTENT_ICONS[item.content_type as keyof typeof CONTENT_ICONS] || <FileText className="h-4 w-4" />}
                    </span>
                    <span className="text-left">{item.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content area */}
      <div className="md:col-span-3">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-6">
            {selectedContent ? (
              <div className="prose max-w-none">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">
                  {selectedContent.title}
                </h1>
                {selectedContent.description && (
                  <p className="text-gray-600 mb-6">{selectedContent.description}</p>
                )}
                {renderContent()}
                <div className="mt-8 pt-6 border-t border-gray-100 text-sm text-gray-500">
                  <p>Përditësuar më: {new Date(selectedContent.updated_at).toLocaleDateString('sq-AL')}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Zgjidhni një përmbajtje për ta parë</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
