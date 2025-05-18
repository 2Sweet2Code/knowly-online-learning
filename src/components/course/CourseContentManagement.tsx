import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Link as LinkIcon, File, Video, BookOpen, Plus, Trash2, Pencil, Download } from 'lucide-react';
import type { CourseContent } from '@/types/database.types';

const CONTENT_TYPES = [
  { value: 'file', label: 'File', icon: <File className="h-4 w-4" /> },
  { value: 'link', label: 'Link', icon: <LinkIcon className="h-4 w-4" /> },
  { value: 'text', label: 'Text', icon: <FileText className="h-4 w-4" /> },
  { value: 'video', label: 'Video', icon: <Video className="h-4 w-4" /> },
  { value: 'assignment', label: 'Assignment', icon: <BookOpen className="h-4 w-4" /> },
];

export function CourseContentManagement() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [content, setContent] = useState<CourseContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  // Form state
  type ContentType = 'file' | 'link' | 'text' | 'video' | 'assignment';
  
  interface FormDataType {
    title: string;
    description: string;
    content_type: ContentType;
    content_url: string;
    file: File | null;
    is_published: boolean;
  }

  const [formData, setFormData] = useState<FormDataType>({
    title: '',
    description: '',
    content_type: 'file',
    content_url: '',
    file: null,
    is_published: false,
  });

  // Fetch course content
  useEffect(() => {
    if (!courseId) return;
    
    const fetchContent = async () => {
      try {
        const { data, error } = await supabase
          .from('course_content')
          .select('*')
          .eq('course_id', courseId)
          .order('position', { ascending: true });

        if (error) throw error;
        setContent(data || []);
      } catch (error) {
        console.error('Error fetching course content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [courseId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        file: e.target.files![0],
        title: e.target.files![0].name,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !user?.id) return;

    setIsUploading(true);
    
    try {
      let fileUrl = formData.content_url;
      
      // Handle file upload if content type is file
      if (formData.content_type === 'file' && formData.file) {
        const fileExt = formData.file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `course-content/${courseId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('course-content')
          .upload(filePath, formData.file);
        
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('course-content')
          .getPublicUrl(filePath);
          
        fileUrl = publicUrl;
      }
      
      // Insert or update content
      const contentData = {
        title: formData.title,
        description: formData.description,
        content_type: formData.content_type,
        content_url: fileUrl,
        file_path: formData.content_type === 'file' ? fileUrl : null,
        file_name: formData.content_type === 'file' ? formData.file?.name || '' : null,
        file_size: formData.content_type === 'file' ? formData.file?.size || 0 : null,
        file_type: formData.content_type === 'file' ? formData.file?.type || '' : null,
        is_published: formData.is_published,
        course_id: courseId,
        created_by: user.id,
        position: content.length,
      };

      if (isEditing) {
        // Update existing content
        const { error } = await supabase
          .from('course_content')
          .update(contentData)
          .eq('id', isEditing);
          
        if (error) throw error;
      } else {
        // Insert new content
        const { error } = await supabase
          .from('course_content')
          .insert(contentData);
          
        if (error) throw error;
      }

      // Refresh content
      const { data, error } = await supabase
        .from('course_content')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (error) throw error;
      
      setContent(data || []);
      resetForm();
      
    } catch (error) {
      console.error('Error saving content:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (item: CourseContent) => {
    setIsEditing(item.id);
    setFormData({
      title: item.title,
      description: item.description || '',
      content_type: item.content_type as ContentType,
      content_url: item.content_url || '',
      file: null,
      is_published: item.is_published,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    
    try {
      const { error } = await supabase
        .from('course_content')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setContent(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      content_type: 'file',
      content_url: '',
      file: null,
      is_published: false,
    });
    setIsEditing(null);
  };

  const getContentIcon = (type: string) => {
    const contentType = CONTENT_TYPES.find(t => t.value === type);
    return contentType ? contentType.icon : <FileText className="h-4 w-4" />;
  };

  if (isLoading) {
    return <div>Loading content...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Edit Content' : 'Add New Content'}</CardTitle>
          <CardDescription>
            {isEditing ? 'Update the content details' : 'Upload files, add links, or create text content'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Content Type</label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value: ContentType) => setFormData(prev => ({
                    ...prev,
                    content_type: value,
                    file: null,
                    content_url: ''
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center">
                          {type.icon}
                          <span className="ml-2">{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Title
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Content title"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Description</label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add a description (optional)"
                rows={3}
              />
            </div>

            {formData.content_type === 'file' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  File
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                />
                {formData.file && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected: {formData.file.name} ({(formData.file.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>
            )}

            {formData.content_type === 'link' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  URL
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="url"
                  name="content_url"
                  value={formData.content_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                  required
                />
              </div>
            )}

            {formData.content_type === 'video' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Video URL
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="url"
                  name="content_url"
                  value={formData.content_url}
                  onChange={handleInputChange}
                  placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                  required
                />
                <p className="text-xs text-gray-500">
                  Supports YouTube, Vimeo, and direct video links
                </p>
              </div>
            )}

            {formData.content_type === 'text' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Content
                  <span className="text-red-500">*</span>
                </label>
                <Textarea
                  name="content_url"
                  value={formData.content_url}
                  onChange={handleInputChange}
                  placeholder="Enter your text content here..."
                  rows={6}
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    is_published: e.target.checked
                  }))}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Publish immediately</span>
              </label>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isEditing ? 'Updating...' : 'Uploading...'}
                    </>
                  ) : isEditing ? 'Update Content' : 'Add Content'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course Content</CardTitle>
          <CardDescription>Manage your course materials and resources</CardDescription>
        </CardHeader>
        <CardContent>
          {content.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium">No content yet</h3>
              <p className="mt-1 text-sm">Add your first piece of content to get started.</p>
            </div>
          ) : (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-10">Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {content.map((item) => {
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getContentIcon(item.content_type)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span>{item.title}</span>
                            {item.description && (
                              <span className="text-xs text-gray-500">
                                {item.description.length > 50 
                                  ? `${item.description.substring(0, 50)}...` 
                                  : item.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.is_published 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.is_published ? 'Published' : 'Draft'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            {(item.content_type === 'file' || item.content_type === 'video') && item.content_url && (
                              <a 
                                href={item.content_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-gray-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            )}
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
