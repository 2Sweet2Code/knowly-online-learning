
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'instructor' | 'student' | 'course_admin';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  courses?: Array<{
    course_id: string;
    course_title: string;
  }>;
}

export const DashboardUserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adminCourses, setAdminCourses] = useState<Array<{id: string, title: string}>>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // Check if user is admin or course admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;

      try {
        // Check if user is super admin
        const isSuperAdmin = user.user_metadata?.role === 'admin';
        
        if (isSuperAdmin) {
          setIsAdmin(true);
          // Super admin can see all courses
          const { data: allCourses } = await supabase
            .from('courses')
            .select('id, title');
          
          if (allCourses) {
            setAdminCourses(allCourses);
          }
        } else {
          // Check if user is a course admin
          const { data: adminData } = await supabase
            .from('course_admins')
            .select('courses(id, title)')
            .eq('user_id', user.id)
            .eq('status', 'approved');

          if (adminData && adminData.length > 0) {
            const courses = adminData.map(admin => ({
              id: (admin.courses as {id: string}).id,
              title: (admin.courses as {title: string}).title
            }));
            setAdminCourses(courses);
            setIsAdmin(true);
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Fetch users based on selected course
  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            role,
            is_active,
            course_enrollments!inner(
              course_id,
              courses!inner(
                id,
                title
              )
            )
          `);

        // If a specific course is selected, filter by that course
        if (selectedCourse !== 'all') {
          query = query.eq('course_enrollments.course_id', selectedCourse);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Define types for the raw data from Supabase
        type CourseEnrollment = {
          course_id: string;
          courses: {
            id: string;
            title: string;
          };
        };

        type UserProfile = {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          is_active: boolean;
          course_enrollments: CourseEnrollment[];
        };

        // Transform the data to match our User interface
        const transformedUsers = (data as UserProfile[] || []).map((userData) => ({
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name,
          role: userData.role,
          is_active: userData.is_active,
          courses: userData.course_enrollments?.map((enrollment) => ({
            course_id: enrollment.courses.id,
            course_title: enrollment.courses.title
          }))
        }));

        setUsers(transformedUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [selectedCourse, isAdmin]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      ));
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brown"></div>
      </div>
    );
  }


  if (!isAdmin) {
    return (
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
          Akses i Kufizuar
        </h3>
        <p>
          Ju nuk keni leje për të parë këtë faqe. Vetëm administratorët dhe administratorët e kurseve mund të shikojnë dhe menaxhojnë përdoruesit.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-playfair pb-3">
          Menaxhimi i Përdoruesve {selectedCourse !== 'all' ? `për Kursin: ${adminCourses.find(c => c.id === selectedCourse)?.title}` : ''}
        </h3>
        
        <div className="flex items-center space-x-4">
          <label htmlFor="course-filter" className="whitespace-nowrap">Filtro sipas Kursit:</label>
          <select
            id="course-filter"
            className="border border-lightGray rounded-md p-2"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="all">Të Gjitha Kurset</option>
            {adminCourses.map(course => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-lightGray shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-lightGray">
            <thead className="bg-cream">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown uppercase tracking-wider">
                  Emri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown uppercase tracking-wider">
                  Roli
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown uppercase tracking-wider">
                  Statusi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brown uppercase tracking-wider">
                  Veprime
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-lightGray">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.full_name || 'Pa Emër'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.courses?.map(c => c.course_title).join(', ') || 'Asnjë kurs'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className="border border-lightGray rounded p-1 text-sm"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                      >
                        <option value="student">Student</option>
                        <option value="instructor">Instruktor</option>
                        <option value="course_admin">Admin Kursi</option>
                        {isAdmin && <option value="admin">Administrator</option>}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? 'Aktiv' : 'I Përkohshëm'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        className={`mr-2 px-3 py-1 rounded text-xs font-medium ${
                          user.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.is_active ? 'Çaktivizo' : 'Aktivizo'}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Nuk u gjetën përdorues për këtë filtrim
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
