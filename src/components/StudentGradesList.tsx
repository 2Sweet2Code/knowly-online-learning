import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, X } from "lucide-react";

interface StudentGradesListProps {
  courseId: string;
}

type StudentGrade = {
  id: string;
  user_id: string;
  course_id: string;
  grade: number | null;
  feedback: string | null;
  name: string;
  email?: string;
  role: string;
};

export const StudentGradesList = ({ courseId }: StudentGradesListProps) => {
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingGrades, setSavingGrades] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchStudentsWithGrades = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First get all enrollments for this course
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('user_id, course_id')
          .eq('course_id', courseId);
        
        if (enrollmentsError) {
          throw enrollmentsError;
        }
        
        if (!enrollments.length) {
          setStudents([]);
          setLoading(false);
          return;
        }
        
        // Get all student profiles
        const userIds = enrollments.map(e => e.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, role, email')
          .in('id', userIds);
        
        if (profilesError) {
          throw profilesError;
        }
        
        // Get existing grades with better error handling
        let grades = [];
        try {
          const { data: gradesData, error: gradesError } = await supabase
            .from('student_grades')
            .select('*')
            .eq('course_id', courseId);
          
          if (!gradesError) {
            grades = gradesData || [];
          } else if (gradesError.message.includes('does not exist')) {
            console.log('student_grades table does not exist yet, continuing without grades');
            // This is expected if the table doesn't exist yet
          } else {
            console.error('Error fetching grades:', gradesError);
          }
        } catch (gradeErr) {
          console.error('Unexpected error fetching grades:', gradeErr);
          // Continue without grades
        }
        
        // Combine the data
        const studentsWithGrades = profiles.map(profile => {
          const grade = grades?.find(g => g.user_id === profile.id) || null;
          
          return {
            id: grade?.id || `new-${profile.id}`,
            user_id: profile.id,
            course_id: courseId,
            grade: grade?.grade || null,
            feedback: grade?.feedback || null,
            name: profile.name || 'Student',
            email: profile.email,
            role: profile.role || 'student'
          };
        });
        
        setStudents(studentsWithGrades);
      } catch (error) {
        console.error('Error fetching students with grades:', error);
        setError('Gabim gjatë ngarkimit të studentëve dhe notave.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentsWithGrades();
  }, [courseId]);
  
  const handleGradeChange = (userId: string, value: string) => {
    // Convert to number or null
    const numValue = value === '' ? null : Number(value);
    
    setStudents(prev => 
      prev.map(student => 
        student.user_id === userId 
          ? { ...student, grade: numValue } 
          : student
      )
    );
  };
  
  const handleFeedbackChange = (userId: string, value: string) => {
    setStudents(prev => 
      prev.map(student => 
        student.user_id === userId 
          ? { ...student, feedback: value } 
          : student
      )
    );
  };
  
  const saveGrade = async (student: StudentGrade) => {
    if (!user) return;
    
    setSavingGrades(prev => ({ ...prev, [student.user_id]: true }));
    
    try {
      // Check if we already have a grade record
      const isNewGrade = student.id.startsWith('new-');
      
      if (isNewGrade) {
        // Insert new grade
        const { error } = await supabase
          .from('student_grades')
          .insert({
            course_id: student.course_id,
            user_id: student.user_id,
            grade: student.grade,
            feedback: student.feedback,
            updated_by: user.id
          });
          
        if (error) {
          // If the table doesn't exist yet, show a message
          if (error.message.includes('does not exist')) {
            toast({
              title: 'Tabela e notave nuk ekziston',
              description: 'Administratori duhet të krijojë tabelën "student_grades" në bazën e të dhënave.',
              variant: 'destructive',
            });
          } else {
            throw error;
          }
        }
      } else {
        // Update existing grade
        const { error } = await supabase
          .from('student_grades')
          .update({
            grade: student.grade,
            feedback: student.feedback,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', student.id);
          
        if (error) {
          throw error;
        }
      }
      
      toast({
        title: 'Sukses!',
        description: `Nota për ${student.name} u ruajt me sukses.`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['studentGrades', courseId] });
      
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: 'Gabim!',
        description: 'Ndodhi një problem gjatë ruajtjes së notës. Ju lutemi provoni përsëri.',
        variant: 'destructive',
      });
    } finally {
      setSavingGrades(prev => ({ ...prev, [student.user_id]: false }));
    }
  };
  
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
  
  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        console.log('Loading timeout reached, forcing display of students');
      }
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(loadingTimeout);
  }, [loading]);
  
  if (loading) {
    return (
      <div className="p-4 text-center">
        Po ngarkohen studentët dhe notat...
        <div className="mt-2 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brown" />
        </div>
      </div>
    );
  }
  
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }
  
  if (!students.length) {
    return <div className="p-4 text-center">Nuk ka studentë të regjistruar ende.</div>;
  }
  
  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-4">Notat e Studentëve ({students.length})</h4>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-cream">
              <th className="p-3 text-left font-semibold border-b">Studenti</th>
              <th className="p-3 text-center font-semibold border-b">Nota</th>
              <th className="p-3 text-left font-semibold border-b">Feedback</th>
              {isInstructor && <th className="p-3 text-center font-semibold border-b">Veprime</th>}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => {
              const isSaving = savingGrades[student.user_id];
              const isCurrentUser = student.user_id === user?.id;
              
              return (
                <tr key={student.user_id} className={`border-b hover:bg-gray-50 ${isCurrentUser ? 'bg-gold/10' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-brown/20 flex items-center justify-center text-brown mr-3">
                        {student.name?.charAt(0).toUpperCase() || 'S'}
                      </div>
                      <div>
                        <span className="font-medium block">{student.name}</span>
                        <span className="text-xs text-gray-500 block">{student.role}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {isInstructor ? (
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        className="w-16 text-center border rounded p-1"
                        value={student.grade === null ? '' : student.grade}
                        onChange={(e) => handleGradeChange(student.user_id, e.target.value)}
                        disabled={isSaving}
                      />
                    ) : (
                      <span className="font-semibold">
                        {student.grade === null ? '-' : student.grade}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {isInstructor ? (
                      <textarea
                        className="w-full border rounded p-2 text-sm"
                        rows={2}
                        value={student.feedback || ''}
                        onChange={(e) => handleFeedbackChange(student.user_id, e.target.value)}
                        placeholder="Shkruani feedback për studentin..."
                        disabled={isSaving}
                      />
                    ) : (
                      <span className="text-sm">
                        {student.feedback || 'Nuk ka feedback ende.'}
                      </span>
                    )}
                  </td>
                  {isInstructor && (
                    <td className="p-3 text-center">
                      <button
                        onClick={() => saveGrade(student)}
                        disabled={isSaving}
                        className="btn btn-sm btn-primary"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
