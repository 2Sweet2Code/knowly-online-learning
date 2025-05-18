import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
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
        // First get all enrollments for this course
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('user_id')
          .eq('course_id', courseId);
        
        if (enrollmentsError) {
          throw enrollmentsError;
        }
        
        if (!enrollments || !enrollments.length) {
          setClassmates([]);
          setLoading(false);
          return;
        }
        
        // Update the course with the correct student count if needed
        try {
          const { data: courseData } = await supabase
            .from('courses')
            .select('students')
            .eq('id', courseId)
            .single();
            
          if (courseData && courseData.students !== enrollments.length) {
            // Update the student count to match the actual number of enrollments
            await supabase
              .from('courses')
              .update({ students: enrollments.length })
              .eq('id', courseId);
          }
        } catch (countError) {
          console.error('Error updating student count:', countError);
          // Continue anyway - this is not critical
        }
        
        // Get user profiles separately to avoid join issues
        const userIds = enrollments.map(e => e.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, role, email, avatar_url')
          .in('id', userIds);
        
        if (profilesError) {
          throw profilesError;
        }
        
        // Map profiles to user objects
        const validClassmates = (profiles || []).map(profile => ({
          id: profile.id,
          name: profile.name || 'Student',
          email: profile.email || '',
          role: (['student', 'instructor', 'admin'].includes(profile.role) 
            ? profile.role 
            : 'student') as 'student' | 'instructor' | 'admin',
          avatar_url: profile.avatar_url
        }));
        
        setClassmates(validClassmates);
      } catch (error) {
        console.error('Error fetching classmates:', error);
        setError('Gabim gjatë ngarkimit të studentëve.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClassmates();
  }, [courseId]);

  const handleLeaveClass = async () => {
    if (!user || !courseId) return;
    
    setIsLeavingClass(true);
    
    try {
      // Remove user from enrollments
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);
      
      if (error) throw error;
      
      // Update local state
      setClassmates(prev => prev.filter(c => c.id !== user.id));
      
      // Show success message
      toast({
        title: 'Sukses',
        description: 'Jeni larguar me sukses nga ky kurs.',
        variant: 'default',
      });
      
      // Redirect to courses page after a short delay
      setTimeout(() => {
        navigate('/courses');
      }, 1500);
      
    } catch (error) {
      console.error('Error leaving class:', error);
      toast({
        title: 'Gabim!',
        description: 'Ndodhi një problem gjatë daljes nga kursi. Ju lutemi provoni përsëri.',
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
