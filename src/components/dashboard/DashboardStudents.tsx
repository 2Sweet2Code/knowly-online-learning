import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, AlertCircle, User, Edit, Save } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type StudentGrade = {
  id?: string;
  user_id: string;
  course_id: string;
  grade: number | null;
  feedback: string | null;
  updated_by?: string;
  updated_at?: string;
  updated_by_name?: string;
};

// Define a combined type for the fetched data
interface InstructorStudentData {
  enrollment_id: string;
  student_id: string;
  student_name: string | null;
  student_email?: string | null;
  student_avatar?: string | null;
  course_id: string;
  course_title: string | null;
  enrolled_at: string | null;
  grade?: number | null;
  feedback?: string | null;
  updated_at?: string | null;
  updated_by_name?: string | null;
}

// Define a type that matches the expected result of the Supabase query
type EnrollmentQueryResult = {
  id: string;
  created_at: string | null;
  course_id: string;
  user_id: string;
  courses: { title: string } | null;
  profiles: { 
    id: string; 
    name: string | null; 
    email: string | null; 
    avatar_url: string | null;
  } | null;
  student_grades?: {
    grade: number | null;
    feedback: string | null;
    updated_at: string | null;
    updated_by_name?: string | null;
  } | null;
};

export const DashboardStudents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingGrades, setEditingGrades] = useState<Record<string, boolean>>({});
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [savingGrades, setSavingGrades] = useState<Record<string, boolean>>({});

  // Query to fetch student enrollment data for instructor's courses
  const { 
    data: studentData = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery<InstructorStudentData[], Error>({
    queryKey: ['instructorStudents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // 1. Fetch IDs of courses taught by the instructor
      const { data: instructorCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('instructor_id', user.id);

      if (coursesError) {
        console.error("Error fetching instructor courses:", coursesError);
        throw new Error("Failed to fetch instructor's courses.");
      }
      if (!instructorCourses || instructorCourses.length === 0) {
          return []; // Instructor has no courses
      }

      const courseIds = instructorCourses.map(c => c.id);
      console.log('Fetching enrollments for course IDs:', courseIds);

      if (courseIds.length === 0) {
        console.log('No course IDs found, returning empty array');
        return [];
      }

      // 2. Fetch enrollments for those courses, joining with profiles, courses, and grades
      let query = supabase
        .from('enrollments')
        .select(`
          id, 
          created_at, 
          course_id, 
          user_id, 
          courses!inner ( 
            title 
          ),
          profiles!inner ( 
            id, 
            name, 
            email,
            avatar_url
          ),
          student_grades!left (
            grade,
            feedback,
            updated_at,
            updated_by_name:profiles!student_grades_updated_by_fkey(name)
          )
        `);

      // Handle the case where there are multiple course IDs
      if (courseIds.length > 0) {
        query = query.in('course_id', courseIds);
      } else {
        // If no course IDs, return empty array
        return [];
      }

      const { data: enrollments, error: enrollmentsError, status, statusText } = await query
        .order('created_at', { ascending: false })
        .returns<EnrollmentQueryResult[]>();

      if (enrollmentsError) {
        console.error("Error fetching enrollments:", {
          error: enrollmentsError,
          status,
          statusText,
          courseIds,
          message: enrollmentsError.message,
          details: enrollmentsError.details,
          hint: enrollmentsError.hint,
          code: enrollmentsError.code
        });
        throw new Error(`Failed to fetch student enrollments: ${enrollmentsError.message}`);
      }
      
      if (!enrollments) return [];

      // 3. Transform data
      const formattedData = enrollments
           .map((enroll) => {
             if (!enroll.profiles || !enroll.courses) {
                 console.warn("Skipping enrollment due to missing profile or course join data:", enroll.id);
                 return null;
             }
             
             const gradeData = enroll.student_grades?.[0];
             
             const studentData: InstructorStudentData = {
                 enrollment_id: enroll.id,
                 student_id: enroll.profiles.id,
                 student_name: enroll.profiles.name || 'Student pa emër',
                 student_email: enroll.profiles.email || null,
                 student_avatar: enroll.profiles.avatar_url || null,
                 course_id: enroll.course_id,
                 course_title: enroll.courses.title || 'Kurs pa emër',
                 enrolled_at: enroll.created_at,
                 grade: gradeData?.grade ?? null,
                 feedback: gradeData?.feedback ?? null,
                 updated_at: gradeData?.updated_at ?? null,
                 updated_by_name: gradeData?.updated_by_name ?? null
             };
             
             return studentData;
           })
           .filter((s): s is InstructorStudentData => s !== null);

      return formattedData;
    },
    enabled: !!user?.id,
  });

  // Get unique courses for the filter dropdown
  const uniqueCourses = Array.from(
    new Map(
      studentData.map(s => [s.course_id, { id: s.course_id, title: s.course_title }])
    ).values()
  );

  // Filter and search students
  const filteredStudents = studentData.filter(student => {
    const matchesCourse = selectedCourseFilter === 'all' || student.course_id === selectedCourseFilter;
    const matchesSearch = searchQuery === '' || 
      student.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.student_email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  const handleViewProfile = (studentId: string) => {
    window.open(`/profile/${studentId}`, '_blank');
  };

  const handleGradeChange = (studentId: string, value: string) => {
    setGradeInputs(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const handleFeedbackChange = (studentId: string, value: string) => {
    setFeedbackInputs(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const toggleEditGrade = (studentId: string) => {
    setEditingGrades(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleSaveGrade = async (student: InstructorStudentData) => {
    if (!user?.id) return;
    
    const studentId = student.student_id;
    const gradeStr = gradeInputs[studentId] ?? student.grade?.toString() ?? '';
    const grade = gradeStr ? parseFloat(gradeStr) : null;
    const feedback = feedbackInputs[studentId] ?? student.feedback ?? '';

    setSavingGrades(prev => ({ ...prev, [studentId]: true }));

    try {
      const gradeData = {
        user_id: studentId,
        course_id: student.course_id,
        grade: grade,
        feedback: feedback || null,
        updated_by: user.id
      };

      let error;
      
      // Check if grade exists
      const { data: existingGrade } = await supabase
        .from('student_grades')
        .select('id')
        .eq('user_id', studentId)
        .eq('course_id', student.course_id)
        .maybeSingle();

      if (existingGrade?.id) {
        // Update existing grade
        const { error: updateError } = await supabase
          .from('student_grades')
          .update(gradeData)
          .eq('id', existingGrade.id);
        error = updateError;
      } else {
        // Insert new grade
        const { error: insertError } = await supabase
          .from('student_grades')
          .insert(gradeData);
        error = insertError;
      }

      if (error) throw error;

      // Update UI
      const updatedStudents = studentData.map(s => {
        if (s.student_id === studentId && s.course_id === student.course_id) {
          return {
            ...s,
            grade,
            feedback: feedback || null,
            updated_at: new Date().toISOString(),
            updated_by_name: user.user_metadata?.full_name || 'Ju'
          };
        }
        return s;
      });

      // Update the query cache
      queryClient.setQueryData(['instructorStudents', user.id], updatedStudents);
      
      // Reset editing state
      setEditingGrades(prev => ({
        ...prev,
        [studentId]: false
      }));

      toast({
        title: 'Sukses',
        description: 'Nota u ruajt me sukses.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë ruajtjes së notës.',
        variant: 'destructive',
      });
    } finally {
      setSavingGrades(prev => ({
        ...prev,
        [studentId]: false
      }));
    }
  };

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brown" />
        <span className="ml-2 text-lg">Po ngarkohen studentët...</span>
      </div>
    );
  }

  if (isError) {
    return (
       <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg p-6">
         <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
         <h4 className="text-lg font-semibold text-red-700 mb-2">Gabim gjatë ngarkimit të studentëve</h4>
         <p className="text-red-600 mb-4">
           {error?.message || "Ndodhi një gabim i papritur."}
         </p>
         <button 
           className="btn btn-secondary btn-sm"
           onClick={() => queryClient.refetchQueries({ queryKey: ['instructorStudents', user?.id] })}
         >
           Provo Përsëri
         </button>
       </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Menaxhimi i Studentëve</h2>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Kërko studentë..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Lista e Studentëve</CardTitle>
              <CardDescription>
                {filteredStudents.length} studentë të gjetur
              </CardDescription>
            </div>
            <div className="w-full md:w-64">
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">Të gjitha kurset</option>
                {uniqueCourses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-4">
            <div className="w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Student</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Kursi</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nota</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Koment</th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Veprimet</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <span>Duke ngarkuar...</span>
                        </div>
                      </td>
                    </tr>
                  ) : isError ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-destructive">
                        <div className="flex items-center justify-center space-x-2">
                          <AlertCircle className="h-5 w-5" />
                          <span>Gabim: {error?.message || 'Ndodhi një gabim gjatë ngarkimit'}</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={`${student.student_id}-${student.course_id}`} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-9 w-9">
                              {student.student_avatar ? (
                                <AvatarImage src={student.student_avatar} alt={student.student_name || ''} />
                              ) : (
                                <AvatarFallback>
                                  {student.student_name?.charAt(0) || 'S'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">{student.student_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {student.student_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="font-medium">{student.course_title}</div>
                          <div className="text-sm text-muted-foreground">
                            Regjistruar më {student.enrolled_at ? new Date(student.enrolled_at).toLocaleDateString('sq-AL') : 'N/A'}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          {editingGrades[student.student_id] ? (
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              className="w-20"
                              value={gradeInputs[student.student_id] ?? student.grade ?? ''}
                              onChange={(e) => handleGradeChange(student.student_id, e.target.value)}
                              disabled={savingGrades[student.student_id]}
                            />
                          ) : (
                            <span className={`font-medium ${student.grade !== null ? 'text-primary' : 'text-muted-foreground'}`}>
                              {student.grade !== null ? student.grade.toFixed(1) : 'Pa notë'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          {editingGrades[student.student_id] ? (
                            <Input
                              type="text"
                              placeholder="Shto koment..."
                              value={feedbackInputs[student.student_id] ?? student.feedback ?? ''}
                              onChange={(e) => handleFeedbackChange(student.student_id, e.target.value)}
                              disabled={savingGrades[student.student_id]}
                            />
                          ) : (
                            <div className="max-w-[200px] truncate">
                              {student.feedback || 'Pa koment'}
                            </div>
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex justify-end space-x-2">
                            {editingGrades[student.student_id] ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleEditGrade(student.student_id)}
                                  disabled={savingGrades[student.student_id]}
                                >
                                  Anulo
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveGrade(student)}
                                  disabled={savingGrades[student.student_id]}
                                >
                                  {savingGrades[student.student_id] ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                  )}
                                  Ruaj
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleEditGrade(student.student_id)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Ndrysho
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewProfile(student.student_id)}
                                  title="Shiko profilin"
                                >
                                  <User className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                          {student.updated_by_name && student.updated_at && (
                            <div className="mt-1 text-xs text-muted-foreground text-right">
                              Përditësuar nga {student.updated_by_name} më {new Date(student.updated_at).toLocaleDateString('sq-AL')}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {studentData.length === 0
                          ? "Nuk keni studentë të regjistruar në kurset tuaja."
                          : "Nuk u gjetën studentë që përputhen me kërkimin tuaj."
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
