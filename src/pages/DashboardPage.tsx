import { useState, useEffect } from "react";
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
import { CreateCourseModal } from "../components/modals/CreateCourseModal";
import { useAuth } from "../context/AuthContext";
import { Navigate, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import CourseManagementPage from "./CourseManagementPage";
import AdminApplyCoursesPage from "./AdminApplyCoursesPage";

const DashboardPage = () => {
  const { user, isLoading } = useAuth();
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);
  
  // Add a timeout to handle cases where loading gets stuck
  useEffect(() => {
    let timeoutId: number | undefined;
    
    if (isLoading) {
      timeoutId = window.setTimeout(() => {
        console.warn('Loading timeout reached in DashboardPage');
        setTimeoutError(true);
      }, 15000); // 15 second timeout
    }
    
    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isLoading]);

  if (!isLoading && (!user || (user.role !== 'instructor' && user.role !== 'admin'))) {
    return <Navigate to="/" />;
  }
  
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="flex items-center">
          <Loader2 className="h-12 w-12 animate-spin text-brown mb-4" />
          <p className="text-lg font-medium ml-2">Duke ngarkuar...</p>
        </div>
        
        {timeoutError && (
          <div className="mt-4 text-center">
            <p className="text-red-600 mb-2">Ngarkimi po merr shumë kohë.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-brown text-white rounded-md hover:bg-brown/80 transition-colors"
            >
              Rifresko faqen
            </button>
          </div>
        )}
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