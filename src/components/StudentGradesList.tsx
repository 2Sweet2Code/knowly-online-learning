import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

interface StudentGradesListProps {
  courseId: string;
}

interface StudentGrade {
  id: string;
  user_id: string;
  course_id: string;
  grade: number | null;
  feedback: string | null;
  name: string;
  email?: string | null;
  role: string;
}

export const StudentGradesList = ({ courseId }: StudentGradesListProps) => {
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingGrades, setSavingGrades] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const fetchStudentsWithGrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get all enrolled students
      const { data: enrolledStudents, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('course_id', courseId);
      
      if (enrollmentError) throw enrollmentError;
      if (!enrolledStudents?.length) {
        setStudents([]);
        return;
      }

      // Get user profiles (only students, exclude instructors and admins)
      const userIds = enrolledStudents.map(e => e.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .in('id', userIds)
        .not('role', 'in', '("instructor","admin")');
      
      if (profilesError) throw profilesError;
      if (!profiles?.length) {
        setStudents([]);
        return;
      }

      // Get existing grades
      const { data: grades = [], error: gradesError } = await supabase
        .from('student_grades')
        .select('*')
        .eq('course_id', courseId)
        .in('user_id', userIds);

      if (gradesError && gradesError.code !== '42P01') { // Ignore "table does not exist" error
        console.error('Error fetching grades:', gradesError);
      }

      // Combine data
      const studentsWithGrades = profiles.map(profile => {
        const grade = grades?.find(g => g.user_id === profile.id) || {
          id: `temp-${profile.id}`,
          course_id: courseId,
          user_id: profile.id,
          grade: null,
          feedback: null
        };
        
        return {
          ...grade,
          name: profile.name || 'Student pa emër',
          email: profile.email,
          role: profile.role || 'student'
        };
      });

      setStudents(studentsWithGrades);
    } catch (error) {
      console.error('Error fetching student grades:', error);
      setError('Gabim gjatë ngarkimit të të dhënave');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchStudentsWithGrades();
  }, [fetchStudentsWithGrades]);

  const handleSaveGrade = async (studentId: string, grade: number | null, feedback: string | null) => {
    if (!user) return;
    
    setSavingGrades(prev => ({ ...prev, [studentId]: true }));
    
    try {
      const { error } = await supabase
        .from('student_grades')
        .upsert({
          id: studentId.startsWith('temp-') ? undefined : studentId,
          user_id: studentId.replace('temp-', ''),
          course_id: courseId,
          grade: grade ? Number(grade) : null,
          feedback
        }, {
          onConflict: 'user_id,course_id'
        });
      
      if (error) throw error;
      
      toast({
        title: 'Sukses',
        description: 'Nota u ruajt me sukses.',
        variant: 'default',
      });
      
      fetchStudentsWithGrades();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë ruajtjes së notës.',
        variant: 'destructive',
      });
    } finally {
      setSavingGrades(prev => ({ ...prev, [studentId]: false }));
    }
  };

  const handleGradeChange = (userId: string, value: string) => {
    setStudents(prev => prev.map(student => 
      student.user_id === userId 
        ? { ...student, grade: value ? parseFloat(value) : null }
        : student
    ));
  };

  const handleFeedbackChange = (userId: string, value: string) => {
    setStudents(prev => prev.map(student => 
      student.user_id === userId 
        ? { ...student, feedback: value }
        : student
    ));
  };

  const renderStudentGrade = (student: StudentGrade) => {
    const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
    const isCurrentStudent = student.user_id === user?.id;
    const isSaving = savingGrades[student.id] || false;

    // Don't show instructors in the list at all
    if (student.role === 'instructor' || student.role === 'admin') return null;
    
    // Only show the student's own grade or if user is an instructor
    if (!isInstructor && !isCurrentStudent) return null;

    return (
      <div key={student.id} className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium">{student.name}</h3>
          {isInstructor && <p className="text-sm text-gray-500">{student.role}</p>}
        </div>
        
        {isInstructor ? (
          <div className="flex flex-col md:flex-row gap-4 mt-2 md:mt-0">
            <div>
              <label className="block text-sm font-medium mb-1">Nota</label>
              <input 
                type="number" 
                min="0" 
                max="10" 
                step="0.1"
                value={student.grade ?? ''} 
                onChange={(e) => handleGradeChange(student.user_id, e.target.value)}
                className="w-20 p-1 border rounded"
                disabled={isSaving}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Feedback</label>
              <textarea 
                value={student.feedback || ''} 
                onChange={(e) => handleFeedbackChange(student.user_id, e.target.value)}
                className="w-full p-1 border rounded"
                rows={2}
                disabled={isSaving}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => handleSaveGrade(student.id, student.grade, student.feedback)}
                disabled={isSaving}
                className="px-3 py-1 bg-brown text-white rounded hover:bg-brown/80 disabled:opacity-50 flex items-center gap-1"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Ruaj
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-2 md:mt-0">
            <div>
              <span className="text-sm font-medium">Nota juaj: </span>
              <span className="text-lg font-semibold">
                {student.grade !== null ? student.grade.toFixed(1) : 'Nuk ka notë'}
              </span>
              {student.grade !== null && <span className="text-sm text-gray-500">/10</span>}
            </div>
            {student.feedback && (
              <div className="mt-1">
                <span className="text-sm font-medium">Komentet e instruktorit: </span>
                <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                  {student.feedback}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Filter students - instructors see all, students see only themselves
  const filteredStudents = user?.role === 'instructor' || user?.role === 'admin'
    ? students
    : students.filter(student => student.user_id === user?.id);

  const currentStudentGrade = students.find(s => s.user_id === user?.id);
  const hasNoGrades = user?.role === 'student' && (!currentStudentGrade || currentStudentGrade.grade === null);

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brown" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">{error}</div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold">
          {user?.role === 'instructor' || user?.role === 'admin' ? 'Notat e Studentëve' : 'Notat e Mia'}
        </h2>
      </div>
      
      {hasNoGrades ? (
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 mb-4">
            <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nuk keni nota akoma</h3>
          <p className="text-gray-500">Instruktori juaj nuk ka vendosur asnjë notë për ju akoma.</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-4 text-gray-500">
          Nuk ka studentë të regjistruar në këtë kurs.
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredStudents.map(student => renderStudentGrade(student))}
        </div>
      )}
    </div>
  );
};