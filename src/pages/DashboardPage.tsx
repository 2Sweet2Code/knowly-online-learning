
import { useState } from "react";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { DashboardOverview } from "../components/dashboard/DashboardOverview";
import { DashboardCourses } from "../components/dashboard/DashboardCourses";
import { DashboardStudents } from "../components/dashboard/DashboardStudents";
import { DashboardAnalytics } from "../components/dashboard/DashboardAnalytics";
import { DashboardSettings } from "../components/dashboard/DashboardSettings";
import { DashboardUserManagement } from "../components/dashboard/DashboardUserManagement";
import { DashboardContentModeration } from "../components/dashboard/DashboardContentModeration";
import { CreateCourseModal } from "../components/modals/CreateCourseModal";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const DashboardPage = () => {
  const { user, isLoading } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);

  // Redirect if not authenticated or not an instructor/admin
  if (!isLoading && (!user || (user.role !== 'instructor' && user.role !== 'admin'))) {
    return <Navigate to="/" />;
  }

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
              activeView={activeView}
              onViewChange={setActiveView}
              onCreateCourseClick={() => setCreateCourseModalOpen(true)}
            />
            
            <div className="flex-grow">
              {activeView === 'dashboard' && (
                <DashboardOverview 
                  onCreateCourseClick={() => setCreateCourseModalOpen(true)}
                  onViewChange={setActiveView}
                />
              )}
              
              {activeView === 'my-courses' && (
                <DashboardCourses 
                  onCreateCourseClick={() => setCreateCourseModalOpen(true)}
                />
              )}
              
              {activeView === 'students' && <DashboardStudents />}
              {activeView === 'analytics' && <DashboardAnalytics />}
              {activeView === 'settings' && <DashboardSettings />}
              {activeView === 'user-management' && <DashboardUserManagement />}
              {activeView === 'content-moderation' && <DashboardContentModeration />}
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
