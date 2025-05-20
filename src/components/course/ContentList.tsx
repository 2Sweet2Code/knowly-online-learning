import React from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { CourseContent } from '@/types/course-content';
import { ContentItem } from './ContentItem';

interface ContentListProps {
  contents: CourseContent[];
  isInstructor: boolean;
  onDragEnd: (result: DropResult) => void;
  onTogglePublish: (content: CourseContent) => void;
  onDelete: (contentId: string) => void;
}

export const ContentList: React.FC<ContentListProps> = ({
  contents,
  isInstructor,
  onDragEnd,
  onTogglePublish,
  onDelete,
}) => {
  if (contents.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="flex flex-col items-center justify-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No content yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            {isInstructor ? 'Get started by adding some content.' : 'Check back later for course materials.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="contents">
        {(provided) => (
          <div 
            {...provided.droppableProps} 
            ref={provided.innerRef} 
            className="space-y-4"
          >
            {contents.map((content, index) => (
              <ContentItem
                key={content.id}
                content={content}
                index={index}
                isInstructor={isInstructor}
                onTogglePublish={onTogglePublish}
                onDelete={onDelete}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};
