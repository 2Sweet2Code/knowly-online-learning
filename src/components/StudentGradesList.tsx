import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

interface StudentGradesListProps {
  courseId: string;
}

interface Profile {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  avatar_url?: string | null;
}

type StudentGrade = {
  id: string;
  user_id: string;
  course_id: string;
  grade: number | null;
  feedback: string | null;
  name: string;
  email?: string | null;
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
  const fetchStudentsWithGrades = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get all enrolled students for this course
      const { data: enrolledStudents, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('course_id', courseId);
      
      if (enrollmentError) {
        throw enrollmentError;
      }
      
      // Extract user IDs
      const userIds = enrolledStudents.map(enrollment => enrollment.user_id);
      
      if (userIds.length === 0) {
        setStudents([]);
        return;
      }
      
      // Get user profiles with email
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role')
        .in('id', userIds);
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw new Error('Gabim gjatë ngarkimit të profileve');
      }
      
      if (!profiles || profiles.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }
      
      // Get existing grades with better error handling
      let grades: Array<{ id?: string; user_id: string; course_id: string; grade: number | null; feedback: string | null }> = [];
      
      try {
        // Try to fetch grades directly
        const { data: gradesData, error: gradesError } = await supabase
          .from('student_grades')
          .select('*')
          .eq('course_id', courseId);
          
        if (gradesError) {
          // If the error is about the table not existing, continue with empty grades
          if (gradesError.code === '42P01') { // 42P01 is the code for "table does not exist"
            console.log('student_grades table does not exist yet, continuing without grades');
          } else {
            console.error('Error fetching grades:', gradesError);
          }
        } else {
          grades = gradesData || [];
        }
      } catch (err) {
        console.error('Error accessing student_grades table:', err);
        // Continue with empty grades if there's an error
      }
      
      // Combine profiles with grades and filter out instructors
      const studentsWithGrades = (profiles as Profile[])
        .filter(profile => profile.role !== 'instructor') // Exclude instructors
        .map(profile => {
          const studentGrade = grades.find(g => g.user_id === profile.id);
          const displayName = profile.name || 
                           (profile.email ? profile.email.split('@')[0] : null) || 
                           'Student';
          return {
            id: studentGrade?.id || `temp-${profile.id}`,
            user_id: profile.id,
            course_id: courseId,
            grade: studentGrade?.grade ?? null,
            feedback: studentGrade?.feedback ?? null,
            name: displayName,
            email: profile.email || null,
            role: profile.role || 'student'
          } as StudentGrade;
        });
      
      setStudents(studentsWithGrades);
    } catch (error) {
      console.error('Error fetching students with grades:', error);
      setError('Gabim gjatë ngarkimit të studentëve dhe notave.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);
  
  useEffect(() => {
    if (courseId) {
      fetchStudentsWithGrades();
    }
  }, [courseId, fetchStudentsWithGrades]);
  
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
      // Validate grade if provided
      if (grade !== null && (grade < 0 || grade > 10)) {
        throw new Error('Nota duhet të jetë midis 0 dhe 10');
      }
      
      // Check if this is a new grade or an update
      const isNew = studentId.startsWith('temp-');
      const userId = isNew ? studentId.replace('temp-', '') : students.find(s => s.id === studentId)?.user_id;
      
      if (!userId) {
        throw new Error('ID e përdoruesit nuk u gjet');
      }
      
      // Create a grade object with proper types
      const gradeData = {
        course_id: courseId,
        user_id: userId,
        grade: grade !== null ? Number(grade) : null,
        feedback: feedback || null,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString()
      };
      
      let error = null;
      
      if (isNew) {
        // For new grades, use upsert to handle potential race conditions
        const { error: upsertError } = await supabase
          .from('student_grades')
          .upsert([gradeData], { onConflict: 'user_id,course_id' })
          .select();
        error = upsertError;
      } else {
        // For updates, use update
        const { error: updateError } = await supabase
          .from('student_grades')
          .update({
            grade: grade !== null ? Number(grade) : null,
            feedback: feedback || null,
            updated_by: user?.id || null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .eq('course_id', courseId);
        error = updateError;
      }
      
      if (error) {
        console.error('Error saving grade:', error);
        // Check if the error is due to the table not existing
        if (error.code === '42P01') { // 42P01 is the code for "table does not exist"
          throw new Error('Tabela e notave nuk ekziston ende. Ju lutem kontaktoni administratorin.');
        }
        throw error;
      }
      
      // Show success message
      toast({
        title: 'Sukses',
        description: 'Nota u ruajt me sukses.',
        variant: 'default',
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['course', courseId, 'grades'] });
      
      // Refresh the component state
      fetchStudentsWithGrades();
      
    } catch (error) {
      console.error('Error saving grade:', error);
      
      // Show error message
      toast({
        title: 'Gabim',
        description: error instanceof Error ? error.message : 'Ndodhi një gabim gjatë ruajtjes së notës. Ju lutem provoni përsëri.',
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
