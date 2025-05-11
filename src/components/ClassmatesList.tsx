import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut } from "lucide-react";
// User type must include: id, name, role, email

interface ClassmatesListProps {
  courseId: string;
}

export const ClassmatesList = ({ courseId }: ClassmatesListProps) => {
  const [classmates, setClassmates] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeavingClass, setIsLeavingClass] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
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
          .select('id, name, role')
          .in('id', userIds);
        
        if (profilesError) {
          throw profilesError;
        }
        
        // Map profiles to user objects
        const validClassmates = profiles.map(profile => {
          // Only accept valid roles
          const role = ['student', 'instructor', 'admin'].includes(profile.role)
            ? (profile.role as 'student' | 'instructor' | 'admin')
            : 'student';
          
          return {
            id: profile.id,
            name: profile.name || 'Student',
            role,
            email: ''
          };
        }) as User[];
        
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
    
    try {
      setIsLeavingClass(true);
      
      // Delete the enrollment record
      const { error: deleteError } = await supabase
        .from('enrollments')
        .delete()
        .eq('course_id', courseId)
        .eq('user_id', user.id);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Update the students count in the course
      const { error: updateError } = await supabase
        .from('courses')
        .update({ students: Math.max(0, (classmates.length - 1)) })
        .eq('id', courseId);
      
      if (updateError) {
        console.error('Error updating student count:', updateError);
      }
      
      // Show success message
      toast({
        title: 'Sukses!',
        description: 'Ju keni dalë nga ky kurs me sukses.',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['enrollments', user.id] });
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      
      // Navigate back to courses page
      navigate('/courses');
      
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

  if (loading) return <div className="p-4 text-center">Po ngarkohen studentët...<div className="mt-2 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-brown" /></div></div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!classmates.length) return <div className="p-4 text-center">Nuk ka studentë të regjistruar ende.</div>;

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold">Studentët në këtë kurs: ({classmates.length})</h4>
        {user && classmates.some(student => student.id === user.id) && (
          <button 
            onClick={handleLeaveClass}
            disabled={isLeavingClass}
            className="btn btn-secondary btn-sm flex items-center gap-1"
          >
            {isLeavingClass ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Duke dalë...
              </>
            ) : (
              <>
                <LogOut className="h-3 w-3" />
                Dil nga Kursi
              </>
            )}
          </button>
        )}
      </div>
      <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {classmates.map((student) => (
          <li key={student.id} className="bg-cream rounded px-3 py-2 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-brown/20 flex items-center justify-center text-brown mr-3">
                {student.name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div>
                <span className="font-medium block">{student.name}</span>
                <span className="text-xs text-gray-500 block">{student.role}</span>
              </div>
            </div>
            {student.id === user?.id && (
              <span className="text-xs bg-gold/20 text-brown px-2 py-1 rounded">Ti</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
