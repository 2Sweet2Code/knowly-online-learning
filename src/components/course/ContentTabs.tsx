import React from 'react';

interface ContentTabsProps {
  activeTab: 'content' | 'assignments';
  onTabChange: (tab: 'content' | 'assignments') => void;
  contentCount: number;
  assignmentCount: number;
}

export const ContentTabs: React.FC<ContentTabsProps> = ({
  activeTab,
  onTabChange,
  contentCount,
  assignmentCount,
}) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        <button
          onClick={() => onTabChange('content')}
          className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
            activeTab === 'content'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span>Course Content</span>
          {contentCount > 0 && (
            <span 
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 'content' 
                  ? 'bg-indigo-100 text-indigo-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {contentCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onTabChange('assignments')}
          className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
            activeTab === 'assignments'
              ? 'border-indigo-500 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span>Assignments</span>
          {assignmentCount > 0 && (
            <span 
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                activeTab === 'assignments' 
                  ? 'bg-indigo-100 text-indigo-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {assignmentCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
};
