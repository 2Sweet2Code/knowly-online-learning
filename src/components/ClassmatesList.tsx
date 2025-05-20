import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, User as UserIcon, UserCog } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define a more specific type that extends the base User type
interface Classmate {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  avatar_url?: string;
}

interface ClassmatesListProps {
  courseId: string;
}

export const ClassmatesList = ({ courseId }: ClassmatesListProps) => {
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [isLeavingClass, setIsLeavingClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!courseId) return;
    
    const fetchClassmates = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First get the course to find the instructor
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('instructor_id, instructor')
          .eq('id', courseId)
          .single();
          
        if (courseError) {
          console.error('Error fetching course:', courseError);
          throw courseError;
        }
        
        // Define the type for enrollment with profile
        type EnrollmentWithProfile = {
          user_id: string;
          profiles: {
            id: string;
            name: string;
            email: string;
            role: string;
            avatar_url?: string;
          } | null;
        };
        
        // Then get all enrollments for this course with user details
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select(`
            user_id,
            profiles (
              id,
              name,
              email,
              role,
              avatar_url
            )
          `)
          .eq('course_id', courseId) as { 
            data: EnrollmentWithProfile[] | null, 
            error: { message: string; details?: string; hint?: string; code?: string } | null 
          };
        
        if (enrollmentsError) {
          console.error('Error fetching enrollments:', enrollmentsError);
          throw enrollmentsError;
        }
        
        if (!enrollments || enrollments.length === 0) {
          setClassmates([]);
          setLoading(false);
          return;
        }
        
        // Update the course with the correct student count if needed
        try {
          // First, get all enrollments with user roles to filter out instructors
          const { data: enrollmentsWithRoles } = await supabase
            .from('enrollments')
            .select('user_id, profiles:profiles!inner(role)')
            .eq('course_id', courseId) as { data: Array<{ user_id: string, profiles: { role: string } }> | null };
            
          // Count only students (exclude instructors and admins)
          const studentCount = enrollmentsWithRoles?.filter(e => 
            e.profiles?.role === 'student'
          ).length || 0;
            
          const { data: courseData } = await supabase
            .from('courses')
            .select('students')
            .eq('id', courseId)
            .single();
            
          if (courseData && courseData.students !== studentCount) {
            // Update the student count to match the actual number of student enrollments
            await supabase
              .from('courses')
              .update({ students: studentCount })
              .eq('id', courseId);
          }
        } catch (countError) {
          console.error('Error updating student count:', countError);
          // Continue anyway - this is not critical
        }
        
        // Process the enrollments to get student data
        const classmatesFromEnrollments = enrollments
          ?.filter(e => e.profiles) // Filter out any enrollments without profile data
          .map(enrollment => ({
            id: enrollment.user_id,
            name: enrollment.profiles?.name || 'Student',
            email: enrollment.profiles?.email || '',
            role: (['student', 'instructor', 'admin'].includes(enrollment.profiles?.role || '') 
              ? (enrollment.profiles.role as 'student' | 'instructor' | 'admin')
              : 'student'),
            avatar_url: enrollment.profiles?.avatar_url
          })) || [];
          
        const validClassmates = [...classmatesFromEnrollments];
          
        // Ensure the course instructor is included even if not in enrollments
        if (course?.instructor_id) {
          const instructorId = course.instructor_id;
          const isInstructorInEnrollments = validClassmates.some(c => c.id === instructorId);
          
          if (!isInstructorInEnrollments) {
            // Try to get instructor's profile
            const { data: instructorProfile } = await supabase
              .from('profiles')
              .select('id, name, email, role, avatar_url')
              .eq('id', instructorId)
              .single();
              
            if (instructorProfile) {
              validClassmates.push({
                id: instructorProfile.id,
                name: instructorProfile.name || 'Instructor',
                email: instructorProfile.email || '',
                role: (['student', 'instructor', 'admin'].includes(instructorProfile.role) 
                  ? instructorProfile.role 
                  : 'instructor') as 'student' | 'instructor' | 'admin',
                avatar_url: instructorProfile.avatar_url
              });
            } else {
              // Fallback to basic info from course
              validClassmates.push({
                id: instructorId,
                name: course.instructor || 'Instructor',
                email: '',
                role: 'instructor',
                avatar_url: ''
              });
            }
          }
        }
          
        setClassmates(validClassmates);
      } catch (error) {
        console.error('Error processing enrollments:', error);
        setError('Gabim gjatë ngarkimit të studentëve.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClassmates();
  }, [courseId]);

  const handleLeaveClass = async () => {
    if (!user?.id || !courseId) {
      toast({
        title: 'Gabim',
        description: 'ID-ja e përdoruesit ose e kursit nuk është e vlefshme.',
        variant: 'destructive',
      });
      return;
    }

    const confirmLeave = window.confirm(
      'A jeni i sigurt që dëshironi të dilni nga ky kurs? Kjo do të fshijë të gjitha të dhënat tuaja të kursit.'
    );

    if (!confirmLeave) return;

    setIsLeavingClass(true);

    try {
      // 1. Find the enrollment
      const { data: enrollment, error: findError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (findError || !enrollment) {
        throw new Error('Nuk u gjet regjistrimi juaj në këtë kurs.');
      }

      // 2. Delete the enrollment
      const { error: deleteError } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enrollment.id);

      if (deleteError) throw deleteError;

      // 3. Clean up related data in parallel
      await Promise.all([
        supabase
          .from('student_grades')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', courseId),
        supabase
          .from('course_comments')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', courseId),
        supabase
          .from('announcement_comments')
          .delete()
          .eq('user_id', user.id)
      ]);

      // 4. Update UI and redirect
      setClassmates(prev => prev.filter(c => c.id !== user.id));
      
      // Invalidate queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enrollments', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
        queryClient.invalidateQueries({ queryKey: ['courses'] }),
        queryClient.invalidateQueries({ queryKey: ['user-enrollments', user.id] })
      ]);

      // Show success message
      toast({
        title: 'Sukses',
        description: 'Jeni larguar me sukses nga ky kurs.',
        variant: 'default',
      });

      // Redirect to courses page
      navigate('/courses');
      window.location.reload();
    } catch (error) {
      console.error('Error leaving course:', error);
      toast({
        title: 'Gabim',
        description: 'Ndodhi një gabë gjatë largimit nga kursi. Ju lutemi provoni përsëri.',
        variant: 'destructive',
      });
    } finally {
      setIsLeavingClass(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        Po ngarkohen studentët...
        <div className="mt-2 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brown" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  if (!classmates.length) {
    return <div className="p-4 text-center">Nuk ka studentë të regjistruar ende.</div>;
  }

  // Separate instructors and students
  const instructors = classmates.filter(c => c.role === 'instructor' || c.role === 'admin');
  const students = classmates.filter(c => c.role === 'student');

  const renderUserCard = (classmate: Classmate, isInstructor: boolean = false) => (
    <div key={classmate.id} className="flex items-center justify-between p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-3">
        <Avatar>
          <AvatarImage src={classmate.avatar_url} alt={classmate.name} />
          <AvatarFallback>
            <UserIcon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{classmate.name}</p>
            {isInstructor && (
              <Badge variant="outline" className="text-xs">
                {classmate.role === 'admin' ? 'Admin' : 'Instruktor'}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500">{classmate.email}</p>
        </div>
      </div>
      {classmate.id === user?.id && (
        <button
          onClick={handleLeaveClass}
          disabled={isLeavingClass}
          className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1 disabled:opacity-50"
        >
          {isLeavingClass ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Po ikni...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Dil nga klasa
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCog className="h-5 w-5" /> Instruktorët
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : instructors.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Nuk ka instruktorë të regjistruar.</div>
          ) : (
            <div className="space-y-2">
              {instructors.map(instructor => renderUserCard(instructor, true))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserIcon className="h-5 w-5" /> Studentët
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-4 text-gray-500">Nuk ka studentë të regjistruar ende.</div>
          ) : (
            <div className="space-y-2">
              {students.map(student => renderUserCard(student))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
