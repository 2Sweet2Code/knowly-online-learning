import { useState } from "react";
import { useParams, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Course, Announcement } from "@/types";
import { Loader2, AlertCircle, Users, LayoutList, Settings, Megaphone } from "lucide-react";
import { Header } from "@/components/Header"; 
import { Footer } from "@/components/Footer";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";
import { AnnouncementModal } from "@/components/dashboard/AnnouncementModal";
import type { Database } from '@/types/supabase';

const CourseStudents = () => {
  const { courseId } = useParams<{ courseId: string }>();
  
  // Fetch regular students (non-instructors, non-admins)
  const { data: students, isLoading: isLoadingStudents, error: studentsError } = useQuery({
    queryKey: ['courseStudents', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      // First get all enrollments
      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select('*, profiles!profiles_id_fkey(*)')
        .eq('course_id', courseId);

      if (error) {
        console.error("Error fetching course enrollments:", error);
        throw error;
      }

      // Filter out instructors and admins (they'll be shown in their own sections)
      return enrollments.filter(e => !e.is_instructor) || [];
    },
    enabled: !!courseId,
  });

  // Fetch instructors
  const { data: instructors, isLoading: isLoadingInstructors, error: instructorsError } = useQuery({
    queryKey: ['courseInstructors', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      // Get the course to find the main instructor
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('instructor_id')
        .eq('id', courseId)
        .single();

      if (courseError) {
        console.error("Error fetching course:", courseError);
        return [];
      }

      // Get all instructors for this course
      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select('*, profiles!profiles_id_fkey(*)')
        .eq('course_id', courseId)
        .eq('is_instructor', true);

      if (error) {
        console.error("Error fetching instructors:", error);
        return [];
      }

      // Mark the main instructor
      return enrollments.map(instructor => ({
        ...instructor,
        is_main_instructor: instructor.user_id === courseData.instructor_id
      }));
    },
    enabled: !!courseId,
  });

  // Fetch admins
  const { data: admins, isLoading: isLoadingAdmins, error: adminsError } = useQuery({
    queryKey: ['courseAdmins', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      const { data, error } = await supabase
        .from('course_admins')
        .select('*, profiles!user_id(*)')
        .eq('course_id', courseId)
        .eq('status', 'approved'); // Only show approved admins

      if (error) {
        console.error("Error fetching course admins:", error);
        return []; // Don't throw error if table doesn't exist yet
      }

      return data || [];
    },
    enabled: !!courseId,
  });

  const isLoading = isLoadingStudents || isLoadingAdmins || isLoadingInstructors;
  const error = studentsError || adminsError || instructorsError;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-brown mx-auto" />
        <p className="mt-2 text-gray-600">Po ngarkohen të dhënat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
        <p>Ndodhi një gabim gjatë ngarkimit të të dhënave.</p>
      </div>
    );
  }

  const hasStudents = students && students.length > 0;
  const hasInstructors = instructors && instructors.length > 0;
  const hasAdmins = admins && admins.length > 0;

  if (!hasStudents && !hasInstructors && !hasAdmins) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50 rounded-md border border-gray-200">
        <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Nuk ka përdorues të regjistruar për këtë kurs ende.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Course Team Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold font-playfair text-gray-800">Ekipi i Kursit</h2>
        
        {/* Admins Section */}
        {hasAdmins && (
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Administratorët e Kursit</h3>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
              {admins?.map((admin) => (
                <div key={admin.id} className="p-3 bg-white rounded-md border border-blue-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {admin.profiles?.name || 'Administrator'}
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                          Administrator
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {admin.profiles?.email || 'Email i panjohur'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructors Section */}
        {hasInstructors && (
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-3">Stafi Mësimor</h3>
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 space-y-3">
              {instructors?.map((instructor) => (
                <div key={instructor.id} className="p-3 bg-white rounded-md border border-purple-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {instructor.profiles?.name || 'Instruktor'}
                        {instructor.is_main_instructor ? (
                          <span className="ml-2 bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded">
                            Instruktor Kryesor
                          </span>
                        ) : (
                          <span className="ml-2 bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded border border-purple-200">
                            Instruktor Ndihmës
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {instructor.profiles?.email || 'Email i panjohur'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Regular Students Section */}
      {hasStudents && (
        <div>
          <h2 className="text-xl font-semibold font-playfair mb-4">Studentët</h2>
          <div className="space-y-3">
            {students.map((student) => (
              <div key={student.id} className="p-3 bg-white rounded-md border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {student.profiles?.name || 'Student'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {student.profiles?.email || 'Email i panjohur'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CourseAssignments = () => <div>Assignments/Content Area</div>;
const CourseSettings = () => <div>Course Settings Content</div>;

const CourseManagementPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Fetch course details
  const { data: course, isLoading, error } = useQuery<Course | null>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('courses') 
        .select('*')
        .eq('id', courseId)
        .single();

      if (supabaseError) {
        console.error("Error fetching course details:", supabaseError);
        throw new Error("Failed to fetch course details.");
      }
      
      if (!supabaseData) {
        return null;
      }

      // Transform data to match Course type
      return {
        ...supabaseData,
        instructorId: supabaseData.instructor_id,
        category: supabaseData.category as 'programim' | 'dizajn' | 'marketing' | 'other',
        isPaid: !!supabaseData.is_paid,
        accessCode: supabaseData.access_code,
        allowAdminApplications: supabaseData.allow_admin_applications,
      } as Course;
    },
    enabled: !!courseId,
  });

  // Fetch announcements
  const { 
    data: announcements = [], 
    isLoading: isAnnouncementsLoading, 
    error: announcementsError 
  } = useQuery<Announcement[]>({
    queryKey: ['courseAnnouncements', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching course announcements:", error);
        if (error.code === '42P01') { 
          const localAnnouncements = JSON.parse(
            localStorage.getItem(`announcements_${courseId}`) || '[]'
          );
          return localAnnouncements;
        }
        throw new Error("Failed to fetch course announcements.");
      }
      
      return data || [];
    },
    enabled: !!courseId,
  });

  const handleOpenModal = () => setIsAnnouncementModalOpen(true);
  const handleCloseModal = () => setIsAnnouncementModalOpen(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-brown" />
        <span className="ml-2 text-brown">Loading Course...</span>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
        <p className="text-red-500 mb-4">
          {error ? (error as Error).message : "Course not found."}
        </p>
        {/* Optionally add a link back to the dashboard */}
        <NavLink to="/dashboard/courses" className="btn btn-secondary">
          Back to Courses
        </NavLink>
      </div>
    );
  }

  // --- Navigation Links ---
  const baseNavClass = "flex items-center px-4 py-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100";
  const activeNavClass = "bg-cream text-brown font-semibold";
  const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
    `${baseNavClass} ${isActive ? activeNavClass : ''}`;

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Course Header */}
          <div className="mb-6 p-4 bg-gradient-to-r from-brown to-brown-dark text-white rounded-lg shadow">
            <h1 className="text-3xl font-playfair font-bold">{course.title}</h1>
            <p className="text-sm opacity-90">{course.description || "Manage your course details."}</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Course Navigation Sidebar */}
            <nav className="w-full lg:w-64 flex-shrink-0 bg-white p-4 rounded-lg border border-lightGray shadow-sm h-fit">
              <ul className="space-y-1">
                <li>
                  <NavLink to="assignments" className={getNavLinkClass}>
                    <LayoutList className="mr-3 h-5 w-5" /> Përmbajtja
                  </NavLink>
                </li>
                <li>
                  <NavLink to="students" className={getNavLinkClass}>
                    <Users className="mr-3 h-5 w-5" /> Studentët
                  </NavLink>
                </li>
                <li>
                  <NavLink to="settings" className={getNavLinkClass}>
                    <Settings className="mr-3 h-5 w-5" /> Cilësimet
                  </NavLink>
                </li>
              </ul>
            </nav>

            {/* Main Content Area for Nested Routes */}
            <div className="flex-grow bg-white p-6 rounded-lg border border-lightGray shadow-sm">
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold font-playfair">Njoftime</h2>
                  <button className="btn btn-primary btn-sm" onClick={handleOpenModal}>
                    Publiko Njoftim
                  </button>
                </div>

                {isAnnouncementsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-brown" />
                    <span className="ml-2 text-gray-600">Duke ngarkuar njoftimet...</span>
                  </div>
                ) : announcementsError ? (
                  <div className="text-center py-4 text-red-500">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                    {(announcementsError as Error).message}
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-8 px-4 bg-gray-50 rounded-md border border-gray-200">
                    <Megaphone className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Nuk ka njoftime për këtë kurs ende.</p>
                    <p className="text-sm text-gray-500 mt-1">Kliko "Publiko Njoftim" për të shtuar të parin.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className="p-4 border rounded-md shadow-sm bg-white">
                        <h3 className="font-semibold text-brown-dark mb-1">{announcement.title}</h3>
                        <p className="text-gray-700 mb-2 text-sm">{announcement.content}</p>
                        <p className="text-xs text-gray-500">
                          Publikuar {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: sq })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                
                <AnnouncementModal 
                  isOpen={isAnnouncementModalOpen} 
                  onClose={handleCloseModal} 
                  courseId={courseId || ''}
                />
              </div>

              <Routes>
                <Route index element={<Navigate to="assignments" replace />} />
                <Route path="assignments" element={<CourseAssignments />} />
                <Route path="students" element={<CourseStudents />} />
                <Route path="settings" element={<CourseSettings />} />
                <Route path="*" element={<Navigate to="assignments" replace />} />
              </Routes>


            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CourseManagementPage; 