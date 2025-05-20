import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import type { Database } from "@/integrations/supabase/types";

type Assignment = Database['public']['Tables']['assignments']['Row'];

interface AssignmentsSectionProps {
  courseId: string;
}

export const AssignmentsSection = ({ courseId }: AssignmentsSectionProps) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('course_id', courseId)
        .order('due_date', { ascending: true });
      if (error) {
        console.error('Error fetching assignments:', error);
        setError('Gabim gjatë ngarkimit të detyrave.');
        setLoading(false);
        return;
      }
      setAssignments(data || []);
      setLoading(false);
    };
    fetchAssignments();
  }, [courseId]);

  if (loading) return <div>Po ngarkohen detyrat...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!assignments.length) return <div>Ende nuk ka detyra për këtë kurs.</div>;

  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">Detyrat e Kursit</h4>
      <ul className="space-y-2">
        {assignments.map((assignment) => (
          <li key={assignment.id} className="bg-cream rounded px-3 py-2">
            <div className="font-medium">{assignment.title}</div>
            <div className="text-sm text-gray-600">{assignment.description}</div>
            {assignment.due_date && (
              <div className="text-xs text-gray-500 mt-1">Afati: {new Date(assignment.due_date).toLocaleDateString()}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
