import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

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

  // Function to fetch students and their grades
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
      
      if (!enrollments || !enrollments.length) {
        setStudents([]);
        setLoading(false);
        return;
      }
      
      // Get all student profiles
      const userIds = enrollments.map(e => e.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', userIds);
      
      if (profilesError) {
        throw profilesError;
      }
      
      // Get existing grades with better error handling
      let grades = [];
      try {
        // Use any type to bypass TypeScript's strict checking
        const { data: gradesData, error: gradesError } = await (supabase as any)
          .from('student_grades')
          .select('*')
          .eq('course_id', courseId);
        
        if (!gradesError) {
          grades = gradesData || [];
        } else if (gradesError.message?.includes('does not exist')) {
          console.log('student_grades table does not exist yet, continuing without grades');
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
  
  useEffect(() => {
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
  
  const handleSaveGrade = async (studentId: string, grade: number | null, feedback: string | null) => {
    setSavingGrades(prev => ({ ...prev, [studentId]: true }));
    try {
      // Check if this is a new grade or an update
      const isNew = studentId.startsWith('new-');
      const userId = isNew ? studentId.replace('new-', '') : students.find(s => s.id === studentId)?.user_id;
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Create a grade object
      const gradeData = {
        course_id: courseId,
        user_id: userId,
        grade,
        feedback,
        updated_by: user?.id || ''
      };
      
      // Use direct database access with proper error handling
      try {
        if (isNew) {
          // For new grades, use direct insert
          const { error } = await (supabase as any)
            .from('student_grades')
            .insert(gradeData);
            
          if (error) throw error;
        } else {
          // For updates, use direct update
          const { error } = await (supabase as any)
            .from('student_grades')
            .update({
              grade,
              feedback,
              updated_by: user?.id
            })
            .eq('id', studentId);
            
          if (error) throw error;
        }
        
        // Show success message
        toast({
          title: 'Nota u ruajt me sukses',
          description: 'Nota dhe feedback-u u ruajtën me sukses.',
          variant: 'default',
        });
        
        // Refresh data
        queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['course', courseId] });
        
        // Refresh the component state
        fetchStudentsWithGrades();
      } catch (dbError: any) {
        // If the table doesn't exist, use localStorage as fallback
        if (dbError.message?.includes('does not exist')) {
          console.log('Using localStorage fallback for grades');
          
          if (isNew) {
            const localGrades = JSON.parse(localStorage.getItem('student_grades') || '[]');
            localGrades.push({
              ...gradeData,
              id: `local-${Date.now()}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            localStorage.setItem('student_grades', JSON.stringify(localGrades));
          } else {
            const localGrades = JSON.parse(localStorage.getItem('student_grades') || '[]');
            const updatedGrades = localGrades.map((g: any) => 
              g.id === studentId ? { ...g, grade, feedback, updated_at: new Date().toISOString() } : g
            );
            localStorage.setItem('student_grades', JSON.stringify(updatedGrades));
          }
          
          toast({
            title: 'Nota u ruajt lokalisht',
            description: 'Nota u ruajt në shfletuesin tuaj. Administratori duhet të krijojë tabelën e notave në bazën e të dhënave.',
            variant: 'default',
          });
        } else {
          throw dbError;
        }
      }
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: 'Gabim gjatë ruajtjes së notës',
        description: 'Ndodhi një gabim gjatë ruajtjes së notës. Ju lutemi provoni përsëri.',
        variant: 'destructive',
      });
    } finally {
      setSavingGrades(prev => ({ ...prev, [studentId]: false }));
    }
  };
  
  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';
  
  // Render a student grade row
  const renderStudentGrade = (student: StudentGrade) => {
    const isSaving = savingGrades[student.id] || false;
    
    return (
      <div key={student.id} className="p-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium">{student.name}</h3>
          <p className="text-sm text-gray-500">{student.role}</p>
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
                value={student.grade === null ? '' : student.grade} 
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
          <div>
            <p><strong>Nota:</strong> {student.grade !== null ? student.grade : 'Nuk është vlerësuar'}</p>
            {student.feedback && (
              <p><strong>Feedback:</strong> {student.feedback}</p>
            )}
          </div>
        )}
      </div>
    );
  };
  
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
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    );
  }
  
  if (!students.length) {
    return (
      <div className="p-4 text-center">
        Nuk ka studentë të regjistruar në këtë kurs.
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Studentët dhe Notat</h2>
      
      <div className="border rounded-md overflow-hidden">
        {students.map(student => renderStudentGrade(student))}
      </div>
    </div>
  );
};
