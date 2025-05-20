import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AssignmentSubmissionForm } from '@/components/assignments/AssignmentSubmissionForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

type Assignment = {
  id: string;
  title: string;
  description: string;
  due_date: string;
  resources?: string;
};

export const SubmitAssignmentPage = () => {
  const { courseId, assignmentId } = useParams<{ courseId: string; assignmentId: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignment = async () => {
      if (!assignmentId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('assignments')
          .select('*')
          .eq('id', assignmentId)
          .single();

        if (error) throw error;
        setAssignment(data);
      } catch (err) {
        console.error('Error fetching assignment:', err);
        setError('Could not load assignment details');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-700">{error || 'Could not load assignment'}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Kthehu te detyrat
      </Button>
      
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
          {assignment.due_date && (
            <p className="text-gray-600 mt-1">
              Afati i dorëzimit: {new Date(assignment.due_date).toLocaleString('sq-AL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>

        {assignment.description && (
          <div className="prose max-w-none">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Përshkrimi i detyrës:</h3>
            <p className="text-gray-700 whitespace-pre-line">{assignment.description}</p>
          </div>
        )}

{assignment.resources && (
          <div className="prose max-w-none mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Burime të dobishme:</h3>
            <div 
              className="prose prose-sm max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: assignment.resources }}
            />
          </div>
        )}

        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-xl font-semibold mb-4">Dorëzo detyrën</h2>
          <AssignmentSubmissionForm />
        </div>
      </div>
    </div>
  );
};

export default SubmitAssignmentPage;
