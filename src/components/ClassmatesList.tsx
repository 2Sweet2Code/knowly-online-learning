import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";
// User type must include: id, name, role, email

interface ClassmatesListProps {
  courseId: string;
}

export const ClassmatesList = ({ courseId }: ClassmatesListProps) => {
  const [classmates, setClassmates] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassmates = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('enrollments')
        .select('user_id, profiles (id, name, role)')
        .eq('course_id', courseId);
      if (error) {
        setError('Gabim gjatë ngarkimit të studentëve.');
        setLoading(false);
        return;
      }
      setClassmates(
        (data || []).map((row: { profiles?: { id: string; name: string; role: string; email?: string } }) => {
          if (!row.profiles) return null;
          // Only accept valid roles
          const role = ['student', 'instructor', 'admin'].includes(row.profiles.role)
            ? (row.profiles.role as 'student' | 'instructor' | 'admin')
            : 'student';
          return {
            id: row.profiles.id,
            name: row.profiles.name,
            role,
            email: row.profiles.email ?? ''
          };
        }).filter(Boolean) as User[]
      );
      setLoading(false);
    };
    fetchClassmates();
  }, [courseId]);

  if (loading) return <div>Po ngarkohen studentët...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!classmates.length) return <div>Nuk ka studentë të regjistruar ende.</div>;

  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">Studentët në këtë kurs:</h4>
      <ul className="space-y-2">
        {classmates.map((student) => (
          <li key={student.id} className="bg-cream rounded px-3 py-2 flex items-center">
            <span className="font-medium mr-2">{student.name}</span>
            <span className="text-xs text-gray-500">({student.role})</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
