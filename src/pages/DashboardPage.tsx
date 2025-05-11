import { useState } from "react";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardOverview } from "../components/dashboard/DashboardOverview";
import { DashboardCourses } from "../components/dashboard/DashboardCourses";
import { DashboardCourseLessons } from "../components/dashboard/DashboardCourseLessons";
import { DashboardStudents } from "../components/dashboard/DashboardStudents";
import { DashboardAnalytics } from "../components/dashboard/DashboardAnalytics";
import { DashboardSettings } from "../components/dashboard/DashboardSettings";
import { DashboardUserManagement } from "../components/dashboard/DashboardUserManagement";
import { DashboardContentModeration } from "../components/dashboard/DashboardContentModeration";
import { DashboardQuestions } from "../components/dashboard/DashboardQuestions";
import { CreateCourseModal } from "../components/modals/CreateCourseModal";
import { useAuth } from "../context/AuthContext";
import { Navigate, Routes, Route, Outlet } from "react-router-dom";
import CourseManagementPage from "./CourseManagementPage";
import AdminApplyCoursesPage from "./AdminApplyCoursesPage";

const DashboardPage = () => {
  const { user, isLoading } = useAuth();
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);

  if (!isLoading && (!user || (user.role !== 'instructor' && user.role !== 'admin'))) {
    return <Navigate to="/" />;
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading... 
      </div>
    );
  }

  const handleCreateCourseClick = () => {
    setCreateCourseModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-cream/50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-playfair font-bold mb-6">
            Paneli i Menaxhimit
          </h1>
          
          <div className="flex flex-col md:flex-row gap-8">
            <DashboardSidebar 
              onCreateCourseClick={handleCreateCourseClick}
            />
            
            <div className="flex-grow">
              <Routes>
                <Route index element={ 
                  <DashboardOverview onCreateCourseClick={handleCreateCourseClick} />
                } /> 
                <Route path="courses">
                  <Route index element={ 
                    <DashboardCourses onCreateCourseClick={handleCreateCourseClick} />
                  } />
                  <Route path=":courseId/*" element={<CourseManagementPage />} />
                </Route>
                <Route path="students" element={<DashboardStudents />} />
                <Route path="analytics" element={<DashboardAnalytics />} />
                <Route path="questions" element={<DashboardQuestions />} />
                <Route path="settings" element={<DashboardSettings />} />
                {user?.role === 'admin' && (
                  <>
                    <Route path="user-management" element={<DashboardUserManagement />} />
                    <Route path="content-moderation" element={<DashboardContentModeration />} />
                    <Route path="apply-courses" element={<AdminApplyCoursesPage />} />
                  </>
                )}
                
                <Route path="*" element={<Navigate to="/dashboard" replace />} /> 
              </Routes>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      <CreateCourseModal 
        isOpen={createCourseModalOpen}
        onClose={() => setCreateCourseModalOpen(false)}
      />
    </div>
  );
};

export default DashboardPage;
