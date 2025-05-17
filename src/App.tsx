import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import React, { useState, useEffect, lazy, Suspense } from "react";

// Dynamically import DevTools to prevent build errors
const ReactQueryDevtools = 
  process.env.NODE_ENV === 'development' 
    ? lazy(() => import('@tanstack/react-query-devtools').then(mod => ({ default: mod.ReactQueryDevtools })))
    : () => null;

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

// Configure the QueryClient with safer defaults
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      // Safer error handling
      retry: 1,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: true
    },
  },
});

const App = () => {
  // Create a new QueryClient instance for each app render
  // This prevents shared mutable state issues during hot reloads
  const [queryClient] = useState(() => createQueryClient());
  
  // Add a global error handler for unhandled promise rejections
  // This helps prevent white screens when there are initialization errors
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('UNHANDLED PROMISE REJECTION:', event.reason);
      // Prevent the error from causing a white screen
      event.preventDefault();
    };
    
    // Add the event listener
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Clean up
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  return (
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
    {process.env.NODE_ENV === 'development' && (
      <Suspense fallback={null}>
        <ReactQueryDevtools />
      </Suspense>
    )}
  </QueryClientProvider>
  );
};

export default App;
