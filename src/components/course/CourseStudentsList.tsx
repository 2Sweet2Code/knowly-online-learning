import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, UserPlus, Mail, UserCheck, UserX } from 'lucide-react';

type Profile = {
  id: string;
  name: string | null;
  email: string;
  avatar_url?: string | null;
  role?: 'student' | 'instructor' | 'admin';
  progress?: number;
  last_accessed?: string | null;
};

type EnrollmentWithProfile = {
  id: string;
  user_id: string;
  course_id: string;
  progress: number;
  completed: boolean;
  role: 'student' | 'instructor';
  created_at: string;
  updated_at: string;
  profiles: Profile;
};

export function CourseStudentsList() {
  const { courseId } = useParams<{ courseId: string }>();
  const [students, setStudents] = useState<Profile[]>([]);
  const [instructors, setInstructors] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState('');

  // Fetch course students and instructors
  useEffect(() => {
    if (!courseId) return;

    const fetchEnrollments = async () => {
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select(`
            *,
            profiles!inner(
              id,
              name,
              email,
              avatar_url,
              role
            )
          `)
          .eq('course_id', courseId);

        if (error) throw error;

        const enrollments = data as unknown as EnrollmentWithProfile[];
        
        // Separate students and instructors
        const courseInstructors = enrollments
          .filter(e => e.role === 'instructor')
          .map(e => ({
            ...e.profiles,
            progress: e.progress,
            role: 'instructor' as const
          }));

        const courseStudents = enrollments
          .filter(e => e.role === 'student')
          .map(e => ({
            ...e.profiles,
            progress: e.progress,
            role: 'student' as const
          }));

        setInstructors(courseInstructors);
        setStudents(courseStudents);
      } catch (error) {
        console.error('Error fetching enrollments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrollments();
  }, [courseId]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !newStudentEmail.trim()) return;

    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, name')
        .ilike('email', newStudentEmail.trim())
        .single();

      if (userError || !userData) {
        alert('User not found with that email.');
        return;
      }

      // Check if already enrolled
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('course_id', courseId)
        .eq('user_id', userData.id)
        .maybeSingle();

      if (existingEnrollment) {
        alert('This user is already enrolled in the course.');
        return;
      }

      // Enroll the user
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert([
          { 
            course_id: courseId, 
            user_id: userData.id,
            role: 'student',
            progress: 0,
            completed: false
          }
        ]);

      if (enrollError) throw enrollError;

      // Refresh the list
      const newStudent: Profile = {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: 'student',
        progress: 0
      };

      setStudents(prev => [...prev, newStudent]);
      setNewStudentEmail('');
      setIsAddingStudent(false);
      
    } catch (error) {
      console.error('Error adding student:', error);
      alert('Failed to add student. Please try again.');
    }
  };

  const handleRemoveStudent = async (userId: string) => {
    if (!courseId || !confirm('Are you sure you want to remove this student?')) return;

    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('course_id', courseId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update UI
      setStudents(prev => prev.filter(s => s.id !== userId));
    } catch (error) {
      console.error('Error removing student:', error);
      alert('Failed to remove student. Please try again.');
    }
  };

  const filteredStudents = students.filter(student => 
    student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructors Section */}
      {instructors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Instructors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {instructors.map((instructor) => (
                <div key={instructor.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={instructor.avatar_url || undefined} alt={instructor.name || ''} />
                      <AvatarFallback>
                        {instructor.name?.charAt(0).toUpperCase() || instructor.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {instructor.name || 'No name'}
                        <Badge variant="secondary" className="ml-2">Instructor</Badge>
                      </div>
                      <div className="text-sm text-gray-500">{instructor.email}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Students</CardTitle>
            <p className="text-sm text-gray-500">
              {students.length} {students.length === 1 ? 'student' : 'students'} enrolled
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAddingStudent(true)}
            className="space-x-1"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Student</span>
          </Button>
        </CardHeader>
        
        {/* Add Student Form */}
        {isAddingStudent && (
          <div className="px-6 pb-4 border-b">
            <form onSubmit={handleAddStudent} className="flex space-x-2">
              <Input
                type="email"
                placeholder="Enter student's email"
                value={newStudentEmail}
                onChange={(e) => setNewStudentEmail(e.target.value)}
                required
                className="flex-1"
              />
              <Button type="submit">Add</Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsAddingStudent(false);
                  setNewStudentEmail('');
                }}
              >
                Cancel
              </Button>
            </form>
          </div>
        )}
        
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search students..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="mx-auto h-10 w-10 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Try a different search term' : 'No students are enrolled yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={student.avatar_url || undefined} alt={student.name || ''} />
                      <AvatarFallback>
                        {student.name?.charAt(0).toUpperCase() || student.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {student.name || 'No name'}
                        {student.role === 'admin' && (
                          <Badge variant="outline" className="ml-2">Admin</Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                      {student.progress !== undefined && (
                        <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${student.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a 
                      href={`mailto:${student.email}`}
                      className="text-gray-400 hover:text-gray-600"
                      title="Send email"
                    >
                      <Mail className="h-5 w-5" />
                    </a>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleRemoveStudent(student.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
