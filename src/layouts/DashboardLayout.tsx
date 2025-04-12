import { useState } from "react";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { DashboardSidebar } from "../components/dashboard/DashboardSidebar";
import { CreateCourseModal } from "../components/modals/CreateCourseModal";
import { useAuth } from "../context/AuthContext";
// Import Outlet for rendering nested routes
import { Navigate, Outlet } from "react-router-dom"; 

// Note: This component now acts as a layout wrapper for dashboard routes
const DashboardLayout = () => {
  const { user, isLoading } = useAuth();
  const [createCourseModalOpen, setCreateCourseModalOpen] = useState(false);

  // Authentication and role check
  if (!isLoading && (!user || (user.role !== 'instructor' && user.role !== 'admin'))) {
    return <Navigate to="/" />;
  }
  
  // Loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading Dashboard...
      </div>
    );
  }

  // Handler for the create course button in the sidebar
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
            {/* Sidebar remains part of the layout */}
            <DashboardSidebar 
              onCreateCourseClick={handleCreateCourseClick}
            />
            
            <div className="flex-grow">
              {/* Outlet renders the matched nested route component defined in App.tsx */}
              <Outlet /> 
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Modal remains part of the layout */}
      <CreateCourseModal 
        isOpen={createCourseModalOpen}
        onClose={() => setCreateCourseModalOpen(false)}
      />
    </div>
  );
};

export default DashboardLayout; 