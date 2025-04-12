import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

import HomePage from "./pages/HomePage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import MySpacePage from "./pages/MySpacePage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ContactPage from "./pages/ContactPage";
import NotFound from "./pages/NotFound";
import CourseManagementPage from "./pages/CourseManagementPage";
import DashboardLayout from "./layouts/DashboardLayout";
import { DashboardOverview } from "./components/dashboard/DashboardOverview";
import { DashboardCourses } from "./components/dashboard/DashboardCourses";
import { DashboardStudents } from "./components/dashboard/DashboardStudents";
import { DashboardAnalytics } from "./components/dashboard/DashboardAnalytics";
import { DashboardSettings } from "./components/dashboard/DashboardSettings";
import { DashboardUserManagement } from "./components/dashboard/DashboardUserManagement";
import { DashboardContentModeration } from "./components/dashboard/DashboardContentModeration";
import { DashboardQuestions } from "./components/dashboard/DashboardQuestions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PayPalScriptProvider options={{ 
      clientId: "test", // Replace with your PayPal client ID in production
      currency: "EUR",
      intent: "capture"
    }}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:courseId" element={<CourseDetailPage />} />
              <Route path="/my-space" element={<MySpacePage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/dashboard/*" element={<DashboardLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="courses">
                  <Route index element={<DashboardCourses />} />
                  <Route path=":courseId/*" element={<CourseManagementPage />} />
                </Route>
                <Route path="students" element={<DashboardStudents />} />
                <Route path="questions" element={<DashboardQuestions />} />
                <Route path="settings" element={<DashboardSettings />} />
                <Route path="user-management" element={<DashboardUserManagement />} />
                <Route path="content-moderation" element={<DashboardContentModeration />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </PayPalScriptProvider>
  </QueryClientProvider>
);

export default App;
