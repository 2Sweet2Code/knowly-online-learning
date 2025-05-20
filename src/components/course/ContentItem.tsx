import React from 'react';
import { CourseContent } from '@/types/course-content';
import { File, Link as LinkIcon, FileText, GripVertical, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Draggable } from 'react-beautiful-dnd';

interface ContentItemProps {
  content: CourseContent;
  index: number;
  isInstructor: boolean;
  onTogglePublish: (content: CourseContent) => void;
  onDelete: (contentId: string) => void;
}

export const ContentItem: React.FC<ContentItemProps> = ({
  content,
  index,
  isInstructor,
  onTogglePublish,
  onDelete,
}) => {
  const renderContentIcon = () => {
    switch (content.content_type) {
      case 'file':
        return <File className="h-5 w-5 text-blue-500" />;
      case 'link':
        return <LinkIcon className="h-5 w-5 text-blue-500" />;
      case 'assignment':
        return <FileText className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <Draggable draggableId={content.id} index={index} isDragDisabled={!isInstructor}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-grow">
              {isInstructor && (
                <div {...provided.dragHandleProps} className="mt-1 cursor-move">
                  <GripVertical className="h-5 w-5 text-gray-400" />
                </div>
              )}
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  {renderContentIcon()}
                  <h4 className="font-medium">{content.title}</h4>
                  {!content.is_published && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                      Draft
                    </span>
                  )}
                </div>
                {content.description && (
                  <p className="text-sm text-gray-600 mt-1">{content.description}</p>
                )}
                {content.content_type === 'link' && content.content_url && (
                  <a
                    href={content.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                  >
                    {content.content_url}
                  </a>
                )}
                {content.content_type === 'file' && content.file_name && (
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">File:</span> {content.file_name}
                    {content.file_size && (
                      <span className="ml-2 text-xs text-gray-400">
                        ({(content.file_size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                )}
                {content.content_type === 'assignment' && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Due:</span> {new Date(content.updated_at).toLocaleDateString()}
                    </div>
                    <div className="mt-1">
                      <Button variant="outline" size="sm" className="text-sm">
                        View Submissions
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {isInstructor && (
              <div className="flex space-x-2">
                <button
                  onClick={() => onTogglePublish(content)}
                  className="text-gray-500 hover:text-gray-700"
                  title={content.is_published ? 'Unpublish' : 'Publish'}
                >
                  {content.is_published ? (
                    <Eye className="h-5 w-5" />
                  ) : (
                    <EyeOff className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => onDelete(content.id)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
