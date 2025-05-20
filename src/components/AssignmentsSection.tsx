import { useEffect, useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import type { AssignmentSubmission } from '@/types/course-content';

// Define the Assignment type
type Assignment = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  resources?: string;
  created_at: string;
  updated_at: string;
};

interface AssignmentsSectionProps {
  courseId: string;
}

export const AssignmentsSection = ({ courseId }: AssignmentsSectionProps) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, AssignmentSubmission>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch assignments (available to all users, including unauthenticated)
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false });

        if (assignmentsError) throw assignmentsError;
        setAssignments(assignmentsData || []);

        // Only fetch submissions if user is authenticated
        if (user?.id) {
          const assignmentIds = assignmentsData?.map(a => a.id) || [];
          if (assignmentIds.length > 0) {
            const { data: submissionsData, error: submissionsError } = await supabase
              .from('assignment_submissions')
              .select('*')
              .in('assignment_id', assignmentIds)
              .eq('user_id', user.id);

            if (submissionsError) throw submissionsError;
            
            // Convert submissions array to an object keyed by assignment_id
            const submissionsMap = (submissionsData || []).reduce((acc, submission) => ({
              ...acc,
              [submission.assignment_id]: submission
            }), {} as Record<string, AssignmentSubmission>);
            
            setSubmissions(submissionsMap);
          }
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Could not load assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, user?.id]);

  // Render loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Detyrat</h2>
          {user?.role === 'student' && (
            <Button disabled>Detyrë e Re</Button>
          )}
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }
  
  // Show login prompt for unauthenticated users
  if (!user) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Detyrat</h2>
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Ju duhet të jeni të kyçur për të parë detyrat tuaja dhe për të dorëzuar detyra të reja.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Detyrat</h2>
          {user?.role === 'student' && (
            <Link to={`/courses/${courseId}/assignments/new`}>
              <Button>Detyrë e Re</Button>
            </Link>
          )}
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Render empty state
  if (assignments.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Detyrat</h2>
          {user?.role === 'student' && (
            <Link to={`/courses/${courseId}/assignments/new`}>
              <Button>Detyrë e Re</Button>
            </Link>
          )}
        </div>
        <div className="text-center py-12">
          <p className="text-gray-500">Nuk ka detyra të disponueshme për këtë kurs.</p>
        </div>
      </div>
    );
  }

  // Render assignments list
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Detyrat</h2>
        {user?.role === 'student' && (
          <Link to={`/courses/${courseId}/assignments/new`}>
            <Button>Detyrë e Re</Button>
          </Link>
        )}
      </div>
      
      <ul className="space-y-4">
        {assignments.map((assignment) => (
          <li key={assignment.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium">{assignment.title}</h3>
                  {submissions[assignment.id] && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span>E dorëzuar</span>
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Afati i dorëzimit: {new Date(assignment.due_date).toLocaleDateString('sq-AL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                {submissions[assignment.id] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    E përditësuar: {new Date(submissions[assignment.id].updated_at).toLocaleString('sq-AL')}
                  </p>
                )}
                
                <div className="mt-3">
                  <p className="text-gray-700">{assignment.description}</p>
                  
                  {assignment.resources && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-800 mb-1">Burimet e Detyres:</h4>
                      <div 
                        className="prose prose-sm max-w-none text-gray-700"
                        dangerouslySetInnerHTML={{ __html: assignment.resources }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="ml-4 flex-shrink-0">
                {user?.role === 'student' && (
                  <Link to={`/courses/${courseId}/assignments/${assignment.id}/submit`}>
                    <Button variant="outline">
                      {submissions[assignment.id] ? 'Shiko Dorëzimin' : 'Dorëzo Detyrën'}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
