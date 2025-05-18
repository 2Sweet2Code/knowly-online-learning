import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Link as LinkIcon, File, Video, BookOpen, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CourseContent } from '@/types/database.types';

const CONTENT_ICONS = {
  file: <File className="h-5 w-5" />,
  link: <LinkIcon className="h-5 w-5" />,
  text: <FileText className="h-5 w-5" />,
  video: <Video className="h-5 w-5" />,
  assignment: <BookOpen className="h-5 w-5" />,
};

export function CourseContentViewer() {
  const { courseId } = useParams<{ courseId: string }>();
  const [content, setContent] = useState<CourseContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<CourseContent | null>(null);

  // Fetch course content
  useEffect(() => {
    if (!courseId) return;

    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from('course_content')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_published', true)
          .order('position', { ascending: true });

        if (error) throw error;
        setContent(data || []);
        
        // Select first content by default if available
        if (data && data.length > 0) {
          setSelectedContent(data[0]);
        }
      } catch (error) {
        console.error('Error fetching course content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [courseId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (content.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No content available</h3>
        <p className="mt-1 text-sm text-gray-500">The instructor hasn't added any content yet.</p>
      </div>
    );
  }

  const renderContent = () => {
    if (!selectedContent) return null;

    switch (selectedContent.content_type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            <h1 className="text-2xl font-bold mb-4">{selectedContent.title}</h1>
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
                Download File
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
              {/* Simple video embed - you might want to enhance this with a proper video player */}
              <video 
                src={selectedContent.content_url || ''} 
                controls 
                className="w-full rounded-lg"
              >
                Your browser does not support the video tag.
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
                Open Link
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
                <h3 className="text-lg font-medium mb-2">Assignment Resources</h3>
                <a 
                  href={selectedContent.content_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Assignment File
                </a>
              </div>
            )}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-3">Submit Your Work</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submission</label>
                  <textarea 
                    className="w-full border border-gray-300 rounded-md p-2 min-h-[100px]"
                    placeholder="Type your submission here or paste a link..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attach Files</label>
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
                  <Button>Submit Assignment</Button>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">This content type is not supported.</p>
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Course Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {content.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedContent(item)}
                  className={`w-full text-left p-3 rounded-md flex items-start space-x-2 transition-colors ${
                    selectedContent?.id === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="mt-0.5">
                    {CONTENT_ICONS[item.content_type as keyof typeof CONTENT_ICONS] || <FileText className="h-4 w-4" />}
                  </span>
                  <span className="text-sm font-medium">{item.title}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        <Card>
          <CardContent className="p-6">
            {selectedContent ? (
              renderContent()
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Select an item to view its content.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
