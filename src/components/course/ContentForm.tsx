import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';

type ContentType = 'file' | 'link' | 'text' | 'assignment';

interface ContentFormProps {
  initialData?: {
    title: string;
    description: string;
    contentType: ContentType;
    contentUrl?: string;
    dueDate?: string;
  };
  onSubmit: (data: {
    title: string;
    description: string;
    contentType: ContentType;
    file?: File | null;
    contentUrl?: string;
    dueDate?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  isEdit?: boolean;
}

export const ContentForm: React.FC<ContentFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  isEdit = false,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [contentType, setContentType] = useState<ContentType>(
    initialData?.contentType || 'text'
  );
  const [file, setFile] = useState<File | null>(null);
  const [contentUrl, setContentUrl] = useState(initialData?.contentUrl || '');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title,
      description,
      contentType,
      file,
      contentUrl: contentType === 'link' ? contentUrl : undefined,
      dueDate: contentType === 'assignment' ? dueDate : undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          {isEdit ? 'Edit Content' : 'Add New Content'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
          disabled={isSubmitting}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            required
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Content Type
          </label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            className="w-full p-2 border rounded-md disabled:opacity-70"
            disabled={isSubmitting}
          >
            <option value="text">Text</option>
            <option value="file">File Upload</option>
            <option value="link">Link</option>
            <option value="assignment">Assignment</option>
          </select>

          {contentType === 'file' && (
            <div className="mt-2">
              <Input
                type="file"
                onChange={handleFileChange}
                required={contentType === 'file' && !isEdit}
                disabled={isSubmitting}
              />
              {file && (
                <div className="mt-1 text-sm text-gray-600">
                  Selected: {file.name}
                </div>
              )}
            </div>
          )}

          {contentType === 'link' && (
            <div className="mt-2">
              <Input
                type="url"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="https://example.com"
                required={contentType === 'link'}
                disabled={isSubmitting}
              />
            </div>
          )}

          {contentType === 'assignment' && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">
                Due Date
              </label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required={contentType === 'assignment'}
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              'Saving...'
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                {isEdit ? 'Update' : 'Add'} Content
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
