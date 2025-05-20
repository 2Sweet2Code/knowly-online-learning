import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

type Profiles = {
  name: string | null;
};

type StudentGradeRow = {
  user_id: string;
  grade: number | null;
  feedback: string | null;
  updated_at: string | null;
  updated_by: Profiles | null;
};

interface StudentGradesListProps {
  courseId: string;
}

interface GradeData {
  grade: number | null;
  feedback: string | null;
  updated_at: string | null;
  updated_by_name: string | null;
}

interface Enrollment {
  user_id: string;
  profiles: {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
  };
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
  updated_by?: string;
  updated_at?: string | null;
  updated_by_name?: string | null;
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
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get all enrolled students
      const { data: enrolledStudents, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          user_id,
          profiles:user_id (id, name, email, role)
        `)
        .eq('course_id', courseId);
      
      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError);
        throw new Error('Gabim gjatë ngarkimit të listës së studentëve.');
      }
      
      if (!enrolledStudents?.length) {
        setStudents([]);
        return;
      }

      const studentIds = enrolledStudents.map(e => e.user_id);
      
      // Initialize an empty array to store student grades
      let studentsWithGrades: StudentGrade[] = [];
      
      try {
        // Try to fetch grades if the table exists
        const { data: gradesData, error: gradesError } = await supabase
          .from('student_grades')
          .select('*')
          .eq('course_id', courseId)
          .in('user_id', studentIds) as { 
            data: StudentGradeRow[] | null, 
            error: { message: string; code?: string } | null 
          };
        
        if (gradesError && gradesError.code !== '42P01') { // Ignore 'relation does not exist' error
          console.error('Error fetching grades:', gradesError);
          throw new Error('Gabim gjatë ngarkimit të notave.');
        }
        
        // Create a map of user_id to grade data for faster lookups
        const gradesMap = new Map<string, GradeData>();
        if (gradesData) {
          gradesData.forEach((grade) => {
            gradesMap.set(grade.user_id, {
              grade: grade.grade,
              feedback: grade.feedback,
              updated_at: grade.updated_at,
              updated_by_name: grade.updated_by?.name || null
            });
          });
        }
        
        // Combine enrollment and grade data
        studentsWithGrades = (enrolledStudents as Enrollment[]).map((enrollment) => {
          const gradeInfo = gradesMap.get(enrollment.user_id);
          return {
            id: enrollment.user_id,
            user_id: enrollment.user_id,
            course_id: courseId,
            name: enrollment.profiles?.name || 'Unknown',
            email: enrollment.profiles?.email,
            role: enrollment.profiles?.role || 'student',
            grade: gradeInfo?.grade ?? null,
            feedback: gradeInfo?.feedback ?? null,
            updated_at: gradeInfo?.updated_at || null,
            updated_by_name: gradeInfo?.updated_by_name || null
          };
        });
        
      } catch (gradesError) {
        console.error('Error processing grades:', gradesError);
        // If we can't fetch grades, just return the student list without grades
        studentsWithGrades = (enrolledStudents as Enrollment[]).map((enrollment) => ({
          id: enrollment.user_id,
          user_id: enrollment.user_id,
          course_id: courseId,
          name: enrollment.profiles?.name || 'Unknown',
          email: enrollment.profiles?.email,
          role: enrollment.profiles?.role || 'student',
          grade: null,
          feedback: null,
          updated_at: null,
          updated_by_name: null
        }));
      }

      setStudents(studentsWithGrades);
    } catch (error) {
      console.error('Error in fetchStudentsWithGrades:', error);
      setError(error instanceof Error ? error.message : 'Gabim gjatë ngarkimit të të dhënave');
      
      // Show error toast
      toast({
        title: 'Gabim',
        description: error instanceof Error ? error.message : 'Ndodhi një gabim gjatë ngarkimit të të dhënave',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast, user]);

  useEffect(() => {
    fetchStudentsWithGrades();
  }, [fetchStudentsWithGrades]);

  const handleSaveGrade = async (studentId: string, grade: number | null, feedback: string | null) => {
    if (!user) return;
    
    const userId = studentId.replace('temp-', '');
    setSavingGrades(prev => ({ ...prev, [studentId]: true }));
    
    try {
      console.log('Saving grade:', { userId, courseId, grade, feedback });
      
      // First check if a grade already exists
      const { data: existingGrade, error: fetchError } = await supabase
        .from('student_grades')
        .select('id, updated_by, updated_at')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();
      
      // If we get a 406 error, it means the table exists but we don't have permission
      // or there's a schema mismatch. We'll try to upsert anyway.
      if (fetchError && fetchError.code !== 'PGRST116' && fetchError.code !== '406') {
        throw fetchError;
      }
      
      // Prepare the data to upsert
      const gradeData = {
        id: existingGrade?.id || undefined, // Let the database generate a new ID if needed
        user_id: userId,
        course_id: courseId,
        grade: grade !== null ? Number(grade) : null,
        feedback: feedback || null,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      };
      
      console.log('Upserting grade data:', gradeData);
      
      // Use upsert to handle both insert and update in one operation
      const { error: upsertError } = await supabase
        .from('student_grades')
        .upsert(gradeData, {
          onConflict: 'user_id,course_id',
          ignoreDuplicates: false
        });
      
      if (upsertError) {
        // If we get a 409 error, it might be due to a unique constraint violation
        // Let's try to update the existing record
        if (upsertError.code === '23505' || upsertError.code === '23514') {
          const { error: updateError } = await supabase
            .from('student_grades')
            .update({
              grade: grade !== null ? Number(grade) : null,
              feedback: feedback || null,
              updated_by: user.id,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('course_id', courseId);
            
          if (updateError) throw updateError;
        } else {
          throw upsertError;
        }
      }
      
      console.log('Grade saved successfully');
      
      toast({
        title: 'Sukses',
        description: 'Nota u ruajt me sukses.',
        variant: 'default',
      });
      
      // Refresh the data
      await fetchStudentsWithGrades();
      
    } catch (error) {
      console.error('Error saving grade:', error);
      let errorMessage = 'Ndodhi një gabim gjatë ruajtjes së notës.';
      
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          code: error['code'],
          details: error['details'],
          hint: error['hint']
        });
        
        // Provide more specific error messages based on the error code
        if (error['code'] === '23503') {
          errorMessage = 'Gabim: ID e përdoruesit ose e kursit nuk ekziston.';
        } else if (error['code'] === '23514') {
          errorMessage = 'Gabim: Vlera e notës duhet të jetë midis 0 dhe 100.';
        } else if (error['code'] === '42501') {
          errorMessage = 'Gabim: Nuk keni leje për të kryer këtë veprim.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Gabim',
        description: errorMessage,
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
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">Nota juaj: </span>
                <span className="text-lg font-semibold">
                  {student.grade !== null ? student.grade.toFixed(1) : 'Nuk ka notë'}
                </span>
                {student.grade !== null && <span className="text-sm text-gray-500">/10</span>}
              </div>
              
              {student.updated_at && (
                <div className="text-xs text-gray-500">
                  Përditësuar më: {new Date(student.updated_at).toLocaleDateString('sq-AL')}
                  {student.updated_by_name && ` nga ${student.updated_by_name}`}
                </div>
              )}
              
              {student.feedback && (
                <div className="mt-1">
                  <span className="text-sm font-medium">Komentet e instruktorit: </span>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                    {student.feedback}
                  </p>
                </div>
              )}
            </div>
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