import { useState, useEffect } from "react";
import { useParams, Routes, Route, NavLink, Outlet, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Course, Announcement } from "@/types";
import { Loader2, AlertCircle, Users, LayoutList, Settings, Megaphone } from "lucide-react";
import { Header } from "@/components/Header"; 
import { Footer } from "@/components/Footer";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";
import { AnnouncementModal } from "@/components/dashboard/AnnouncementModal";
import { useAuth } from "@/context/AuthContext";

// --- Course Stream Component --- 
const CourseStream = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const { user } = useAuth();

  const { data: announcements = [], isLoading, error } = useQuery<Announcement[]>({
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
          const localAnnouncements = JSON.parse(localStorage.getItem(`announcements_${courseId}`) || '[]');
          return localAnnouncements;
        } else {
          throw new Error("Failed to fetch course announcements.");
        }
      }
      
      return data || [];
    },
    enabled: !!courseId,
  });
  
  const handleOpenModal = () => setIsAnnouncementModalOpen(true);
  const handleCloseModal = () => setIsAnnouncementModalOpen(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold font-playfair">Njoftime</h2>
        <button className="btn btn-primary btn-sm" onClick={handleOpenModal}>
          Publiko Njoftim
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brown" />
          <span className="ml-2 text-gray-600">Loading announcements...</span>
        </div>
      ) : error ? (
        <div className="text-center py-4 text-red-500">
          <AlertCircle className="h-6 w-6 mx-auto mb-2" />
          {(error as Error).message}
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
        courseId={courseId}
      />
    </div>
  );
};

import type { Database } from '@/types/supabase';

const CourseStudents = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();

  // Fetch course details to get instructor_id
  const { data: course, isLoading: courseLoading } = useQuery<{ instructor_id: string } | null>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from('courses')
        .select('instructor_id')
        .eq('id', courseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  // Fetch all enrolled students (excluding instructor)
  // Define the type for the join query result
  type EnrollmentWithProfile = {
    user_id: string;
    profiles: {
      id: string;
      name: string | null;
      role: string | null;
    } | null;
  };
  const {
    data: students,
    isLoading: studentsLoading,
    error: studentsError,
  } = useQuery<Array<{ id: string; name: string | null; role: string | null }>>({
    queryKey: ['courseStudents', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select('user_id, profiles (id, name, role)')
        .eq('course_id', courseId);
      if (error) throw error;
      const instructorId = course?.instructor_id;
      // Define a type for the data that includes the possibility of a SelectQueryError
      type EnrollmentData = {
        user_id: string;
        profiles: { id?: string; name?: string | null; role?: string | null; error?: boolean } | null;
      };
      
      // Cast the data to unknown first, then to our flexible type
      const enrollments = data as unknown as EnrollmentData[];
      
      // Use a more flexible approach to handle the data
      return (enrollments || []).filter((enr) => {
        // Check if this is a valid enrollment with a user_id that's not the instructor
        return enr && enr.user_id && enr.user_id !== instructorId;
      }).map((enr) => {
        // Try to extract profile data safely
        const profile = enr.profiles && typeof enr.profiles === 'object' && !enr.profiles.error
          ? enr.profiles
          : null;
          
        return {
          id: profile?.id || enr.user_id,
          name: profile?.name || 'Unknown User',
          role: profile?.role || 'student'
        };
      });
    },
    enabled: !!courseId && !!course,
  });

  if (courseLoading || studentsLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-brown" />
        <span className="ml-2 text-gray-600">Loading students...</span>
      </div>
    );
  }

  if (studentsError) {
    return (
      <div className="text-center py-4 text-red-500">
        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
        {(studentsError as Error).message}
      </div>
    );
  }

  const isInstructor = user?.id && course?.instructor_id && user.id === course.instructor_id;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold font-playfair mb-4 flex items-center">
        <Users className="h-5 w-5 mr-2" />
        Studentët e Kursit
        {isInstructor && (
          <span className="ml-3 text-base text-gray-500">({Array.isArray(students) ? students.length : 0})</span>
        )}
      </h2>
      {(!Array.isArray(students) || students.length === 0) ? (
        <div className="text-center py-8 px-4 bg-gray-50 rounded-md border border-gray-200">
          <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Nuk ka studentë të regjistruar në këtë kurs ende.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 bg-white rounded-lg shadow-sm">
          {(students ?? []).map((student) => (
            <li key={student.id} className="py-3 px-4 flex items-center">
              <span className="font-medium text-brown-dark">{student.name || 'Emër i panjohur'}</span>
              <span className="ml-2 text-xs text-gray-500">({student.role})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
const CourseAssignments = () => <div>Assignments/Content Area</div>; // Example section
const CourseSettings = () => <div>Course Settings Content</div>; 

const CourseManagementPage = () => {
  const { courseId } = useParams<{ courseId: string }>();

  // Fetch course details
  const { data: course, isLoading, error } = useQuery<Course | null>({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null;
      
      // Example using Supabase:
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
        return null; // Or handle as not found
      }

      // Transform data to match Course type
      const transformedData: Course = {
        ...supabaseData,
        instructorId: supabaseData.instructor_id, // Map instructor_id to instructorId
        // Ensure other properties match or handle potential mismatches
        // Example: Ensure category is one of the allowed literals
        category: supabaseData.category as 'programim' | 'dizajn' | 'marketing' | 'other',
        status: supabaseData.status as 'active' | 'draft'
      };

      return transformedData;
    },
    enabled: !!courseId,
  });

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
                  <NavLink to="stream" className={getNavLinkClass} end>
                    <Megaphone className="mr-3 h-5 w-5" /> Stream
                  </NavLink>
                </li>
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
              <Routes>
                <Route index element={<Navigate to="stream" replace />} />
                <Route path="stream" element={<CourseStream />} />
                <Route path="assignments" element={<CourseAssignments />} />
                <Route path="students" element={<CourseStudents />} />
                <Route path="settings" element={<CourseSettings />} />
                <Route path="*" element={<Navigate to="stream" replace />} /> 
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