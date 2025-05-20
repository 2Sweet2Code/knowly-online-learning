"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Edit, Search, User as UserIcon, Save, Loader2, RefreshCw, Users, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Database } from '@/types/database.types';
import { Skeleton } from '@/components/ui/skeleton';

interface StudentGrade {
  id?: string;
  user_id: string;
  course_id: string;
  enrollment_id: string;
  grade: number | null;
  feedback: string | null;
  updated_by?: string;
  updated_at?: string | null;
  updated_by_name?: string | null;
  created_at?: string;
}

interface InstructorStudentData {
  id: string;
  student_id: string;
  student_name: string | null;
  student_email: string | null;
  student_avatar: string | null;
  course_id: string;
  course_title: string;
  enrollment_id: string;
  enrolled_at: string | null;
  grade: number | null;
  feedback: string | null;
  updated_at: string | null;
  updated_by_name: string | null;
}

type Course = {
  id: string;
  title: string;
};

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
};

interface Enrollment {
  id: string;
  course_id: string;
  user_id: string;
  created_at: string;
  courses: Course | null;
  profiles: Profile[];
}

interface EnrollmentWithProfile extends Omit<Enrollment, 'profiles'> {
  profiles: Profile[];
}

export function DashboardStudents() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Use the existing Supabase client
  const supabaseClient = supabase;
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [editingGrades, setEditingGrades] = useState<Record<string, boolean>>({});
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [savingGrades, setSavingGrades] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Query to fetch instructor's courses and their enrollments
  const { data: studentData = [], isLoading, isError, error } = useQuery<InstructorStudentData[]>({
    queryKey: ['instructorStudents', user?.id],
    queryFn: async (): Promise<InstructorStudentData[]> => {
      if (!user?.id) return [];

      try {
        // 1. Fetch instructor's courses with left join to enrollments
        const { data, error: coursesError } = await supabaseClient
          .from('courses')
          .select(`
            id,
            title,
            instructor_id,
            enrollments!enrollments_course_id_fkey (
              id,
              user_id,
              created_at,
              profiles!enrollments_user_id_fkey (
                id,
                name,
                email,
                avatar_url
              )
            )
          `)
          .eq('instructor_id', user.id);

        if (coursesError) {
          console.error("Error fetching instructor courses:", coursesError);
          throw new Error("Failed to fetch instructor's courses.");
        }
        if (!data || data.length === 0) {
          return []; // Instructor has no courses
        }

        // 2. Transform data to flatten the structure
        const result: InstructorStudentData[] = [];
        
        for (const course of data) {
          const courseId = course.id;
          const courseTitle = course.title;
          
          // If there are no enrollments, add the course with null student data
          if (!course.enrollments || course.enrollments.length === 0) {
            result.push({
              id: courseId,
              student_id: '',
              student_name: null,
              student_email: null,
              student_avatar: null,
              course_id: courseId,
              course_title: courseTitle,
              enrollment_id: '',
              enrolled_at: null,
              grade: null,
              feedback: null,
              updated_at: null,
              updated_by_name: null
            });
            continue;
          }
          
          // Process each enrollment
          for (const enrollment of course.enrollments) {
            const profiles = Array.isArray(enrollment.profiles) ? enrollment.profiles : [enrollment.profiles];
            if (!profiles || profiles.length === 0) continue;
            
            const profile = profiles[0];
            
            // Skip if this is the instructor
            if (profile.id === course.instructor_id) continue;
            
            // Get grade if it exists - using user_id and course_id as per the schema
            let gradeInfo: StudentGrade | null = null;
            if (enrollment.user_id && courseId) {
              const { data: gradeData } = await supabaseClient
                .from('student_grades')
                .select('*')
                .eq('user_id', enrollment.user_id)
                .eq('course_id', courseId)
                .maybeSingle();
              
              if (gradeData) {
                // Create a new grade info object with all required fields
                // Using type assertion to handle the partial data from the database
                const dbGrade = gradeData as Partial<StudentGrade>;
                
                gradeInfo = {
                  id: dbGrade.id || '',
                  user_id: dbGrade.user_id || enrollment.user_id,
                  course_id: dbGrade.course_id || courseId || '',
                  enrollment_id: enrollment.id, // Use the enrollment id from the enrollment object
                  grade: dbGrade.grade ?? null,
                  feedback: dbGrade.feedback ?? null,
                  updated_by: dbGrade.updated_by,
                  updated_at: dbGrade.updated_at ?? null,
                  updated_by_name: dbGrade.updated_by_name ?? null,
                  created_at: dbGrade.created_at || new Date().toISOString()
                };
              }
            }
            
            result.push({
              id: enrollment.id,
              student_id: enrollment.user_id,
              student_name: profile?.name || 'Student pa emër',
              student_email: profile?.email || null,
              student_avatar: profile?.avatar_url || null,
              course_id: courseId,
              course_title: courseTitle,
              enrollment_id: enrollment.id,
              enrolled_at: enrollment.created_at,
              grade: gradeInfo?.grade ?? null,
              feedback: gradeInfo?.feedback ?? null,
              updated_at: gradeInfo?.updated_at ?? null,
              updated_by_name: gradeInfo?.updated_by_name || null
            });
          }
        }
        
        return result;
      } catch (error) {
        console.error("Error in query function:", error);
        throw error;
      }
    },
    enabled: !!user?.id,
  });

  // Memoize derived data
  const { uniqueCourses, filteredStudents, paginatedStudents, totalPages } = useMemo(() => {
    // Get unique courses for the filter dropdown
    const coursesMap = new Map<string, { id: string; title: string }>();
    studentData.forEach(student => {
      if (!coursesMap.has(student.course_id)) {
        coursesMap.set(student.course_id, { 
          id: student.course_id, 
          title: student.course_title 
        });
      }
    });
    const uniqueCourses = Array.from(coursesMap.values());

    // Filter students based on search and course filter
    const filtered = studentData.filter(student => {
      const matchesCourse = selectedCourseFilter === 'all' || 
                          student.course_id === selectedCourseFilter;
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        (student.student_name?.toLowerCase().includes(searchLower) ||
         student.student_email?.toLowerCase().includes(searchLower));
      
      return matchesCourse && matchesSearch;
    });

    // Pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    return { 
      uniqueCourses, 
      filteredStudents: filtered,
      paginatedStudents: paginated,
      totalPages
    };
  }, [studentData, selectedCourseFilter, searchQuery, currentPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCourseFilter, searchQuery]);

  const handleViewProfile = useCallback((studentId: string) => {
    window.open(`/profile/${studentId}`, '_blank');
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Loading skeleton for student rows
  const renderLoadingSkeletons = () => {
    return Array(5).fill(0).map((_, index) => (
      <tr key={`skeleton-${index}`} className="border-b">
        <td className="p-4">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </td>
        <td className="p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-32 mt-1" />
        </td>
        <td className="p-4">
          <Skeleton className="h-9 w-20" />
        </td>
        <td className="p-4">
          <Skeleton className="h-9 w-40" />
        </td>
        <td className="p-4 text-right">
          <div className="flex justify-end space-x-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-9" />
          </div>
        </td>
      </tr>
    ));
  };

  const handleGradeChange = (studentId: string, courseId: string, value: string) => {
    const key = `${studentId}-${courseId}`;
    setGradeInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleFeedbackChange = (studentId: string, courseId: string, value: string) => {
    const key = `${studentId}-${courseId}`;
    setFeedbackInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleEditGrade = (studentId: string, courseId: string) => {
    const key = `${studentId}-${courseId}`;
    setEditingGrades(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveGrade = async (studentId: string, courseId: string, enrollmentId: string) => {
    const student = studentData.find(s => s.student_id === studentId && s.course_id === courseId);
    if (!student || !user?.id) return;

    const grade = parseFloat(gradeInputs[`${studentId}-${courseId}`] || '0');
    const feedback = feedbackInputs[`${studentId}-${courseId}`] || '';

    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast({
        title: 'Gabim',
        description: 'Ju lutem vendosni një notë midis 0 dhe 100',
        variant: 'destructive',
      });
      return;
    }

    setSavingGrades(prev => ({
      ...prev,
      [studentId]: true
    }));

    try {
      const gradeData = {
        user_id: student.student_id,  // Use student_id from the interface
        course_id: courseId,
        grade: grade,
        feedback: feedback || null,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };

      let error;
      
      // Check if grade exists - using user_id and course_id as per the schema
      const { data: existingGrade, error: existingGradeError } = await supabaseClient
        .from('student_grades')
        .select('id')
        .eq('user_id', student.student_id)  // Use student.student_id
        .eq('course_id', courseId)
        .maybeSingle();

      if (existingGradeError) {
        console.error('Error fetching existing grade:', existingGradeError);
        throw existingGradeError;
      }

      if (existingGrade?.id) {
        // Update existing grade
        const { error: updateError } = await supabaseClient
          .from('student_grades')
          .update(gradeData)
          .eq('user_id', studentId)
          .eq('course_id', courseId);
        error = updateError;
      } else {
        // Insert new grade
        const { error: insertError } = await supabaseClient
          .from('student_grades')
          .insert(gradeData);
        error = insertError;
      }

      if (error) throw error;

      // Update UI
      const updatedStudents = studentData.map(s => {
        if (s.student_id === studentId && s.course_id === courseId) {
          return {
            ...s,
            grade,
            feedback: feedback || null,
            updated_at: gradeData.updated_at,
            updated_by_name: user.user_metadata?.full_name || 'Instructor'
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

      // Clear the inputs
      setGradeInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[`${studentId}-${courseId}`];
        return newInputs;
      });
      setFeedbackInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[`${studentId}-${courseId}`];
        return newInputs;
      });

      toast({
        title: 'Sukses',
        description: 'Nota u ruajt me sukses.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabim gjatë ruajtjes së notës: ' + (error instanceof Error ? error.message : 'Unknown error'),
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
  if (isError) {
    return (
      <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex flex-col items-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Gabim gjatë ngarkimit të të dhënave</h3>
          <p className="text-red-600 mb-6 max-w-md">
            {error?.message || "Ndodhi një gabim gjatë ngarkimit të listës së studentëve. Ju lutemi provoni përsëri më vonë."}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              onClick={() => queryClient.refetchQueries({ queryKey: ['instructorStudents', user?.id] })}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Provoni Përsëri
            </Button>
            <Button
              variant="ghost"
              onClick={() => window.location.reload()}
              className="text-red-700"
            >
              Rifresko Faqen
            </Button>
          </div>
        </div>
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
                      <td colSpan={5}>
                        {renderLoadingSkeletons()}
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-4">
                          <Users className="h-12 w-12 text-gray-300" />
                          <div>
                            <h4 className="text-lg font-medium text-gray-700">
                              {studentData.length === 0 
                                ? "Nuk keni studentë të regjistruar në kurset tuaja."
                                : "Nuk u gjetën studentë që përputhen me kërkimin tuaj."
                              }
                            </h4>
                            {studentData.length === 0 && (
                              <p className="text-sm text-gray-500 mt-2">
                                Studentët të cilët regjistrohen në kurset tuaja do të shfaqen këtu.
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
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
                          {editingGrades[`${student.student_id}-${student.course_id}`] ? (
                            <Input
                              type="number"
                              min="0"
                              max="10"
                              step="0.1"
                              className="w-20"
                              value={gradeInputs[`${student.student_id}-${student.course_id}`] ?? student.grade ?? ''}
                              onChange={(e) => handleGradeChange(student.student_id, student.course_id, e.target.value)}
                              disabled={savingGrades[student.student_id]}
                            />
                          ) : (
                            <span className={`font-medium ${student.grade !== null ? 'text-primary' : 'text-muted-foreground'}`}>
                              {student.grade !== null ? Number(student.grade).toFixed(1) : 'Pa notë'}
                            </span>
                          )}
                        </td>
                        <td className="p-4 align-middle">
                          {editingGrades[`${student.student_id}-${student.course_id}`] ? (
                            <Input
                              type="text"
                              placeholder="Shto koment..."
                              value={feedbackInputs[`${student.student_id}-${student.course_id}`] ?? student.feedback ?? ''}
                              onChange={(e) => handleFeedbackChange(student.student_id, student.course_id, e.target.value)}
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
                            {editingGrades[`${student.student_id}-${student.course_id}`] ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleEditGrade(student.student_id, student.course_id)}
                                  disabled={savingGrades[student.student_id]}
                                >
                                  Anulo
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveGrade(student.student_id, student.course_id, student.enrollment_id)}
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
                                  onClick={() => toggleEditGrade(student.student_id, student.course_id)}
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
                                  <UserIcon className="h-4 w-4" />
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
                  )}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Shfaqen <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> deri në{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
                    </span>{' '}
                    nga <span className="font-medium">{filteredStudents.length}</span> studentë
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Paraardhësi
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // Show first, last, current, and adjacent pages
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "ghost"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className={pageNum === currentPage ? "font-bold" : ""}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <span className="px-2 text-muted-foreground">...</span>
                      )}
                      {totalPages > 5 && currentPage < totalPages - 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                        >
                          {totalPages}
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Tjetri
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Empty state for no courses */}
      {!isLoading && uniqueCourses.length === 0 && (
        <div className="text-center py-16 border rounded-lg bg-muted/50">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">Nuk keni kurse aktive</h3>
          <p className="text-muted-foreground mt-2">
            Kur të keni studentë të regjistruar në kurset tuaja, ata do të shfaqen këtu.
          </p>
          <Button className="mt-4" onClick={() => window.location.href = '/instructor/courses'}>
            Shiko Kurset e Mia
          </Button>
        </div>
      )}
    </div>
  );
};
