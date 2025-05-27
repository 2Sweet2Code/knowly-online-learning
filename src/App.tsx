import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthProvider";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import React, { useState, useEffect, lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";

// Dynamically import DevTools to prevent build errors
const ReactQueryDevtools = 
  process.env.NODE_ENV === 'development' 
    ? lazy(() => import('@tanstack/react-query-devtools').then(mod => ({ default: mod.ReactQueryDevtools })))
    : () => null;

import HomePage from "./pages/HomePage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailWrapper from "./components/CourseDetailWrapper";
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

// Import debug utility
import { safeCheckCourses } from './utils/checkCourses';
import { DashboardUserManagement } from "./components/dashboard/DashboardUserManagement";
import { DashboardContentModeration } from "./components/dashboard/DashboardContentModeration";
import { SubmitAssignmentPage } from "./pages/assignments/SubmitAssignmentPage";
import ManageCourseApplications from "./pages/ManageCourseApplications";
// Temporarily comment out DashboardQuestions to identify build issues
// import { DashboardQuestions } from "./components/dashboard/DashboardQuestions";

// Configure the QueryClient with safer defaults and proper error handling
const createQueryClient = () => {
  // Create a custom error handler for React Query
  const queryErrorHandler = (error: unknown) => {
    // Log the error but don't throw it
    console.error('React Query error:', error);
    // We intentionally don't rethrow to prevent unhandled rejections
  };

  // Return a new QueryClient with robust configuration
  return new QueryClient({
    // Add global error handlers at the cache level
    queryCache: new QueryCache({
      onError: queryErrorHandler,
    }),
    mutationCache: new MutationCache({
      onError: queryErrorHandler,
    }),
    defaultOptions: {
      queries: {
        // Safer error handling
        retry: 1,
        retryDelay: 1000,
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: true
      }
    },
  });
};

// Wrap the app in a try-catch to prevent crashes during initialization
const App = () => {
  // Create a new QueryClient instance for each app render
  // This prevents shared mutable state issues during hot reloads
  const [queryClient] = useState(() => {
    try {
      return createQueryClient();
    } catch (error) {
      console.error('Failed to create QueryClient:', error);
      // Return a basic client as fallback
      return new QueryClient({
        defaultOptions: {
          queries: {
            retry: 0,
            refetchOnWindowFocus: false,
          },
        },
      });
    }
  });
  
  // Track initialization state
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  
  // Add a global error handler for unhandled promise rejections and other errors
  useEffect(() => {
    // Handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('UNHANDLED PROMISE REJECTION:', event.reason);
      // Prevent the error from causing a white screen
      event.preventDefault();
      event.stopPropagation();
    };
    
    // Handler for uncaught errors
    const handleError = (event: ErrorEvent) => {
      // Log the error but prevent it from propagating
      console.error('UNCAUGHT ERROR:', event.error);
      event.preventDefault();
      event.stopPropagation();
      
      // If this is an initialization error, store it to show a fallback UI
      if (event.error && (event.error.toString().includes("Cannot access") || 
          event.error.toString().includes("before initialization"))) {
        setInitializationError(event.error);
      }
    };
    
    // Add the event listeners with capture to catch more errors
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    window.addEventListener('error', handleError, true);
    
    // Clean up
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      window.removeEventListener('error', handleError, true);
    };
  }, []);
  
  // Create a state to track if PayPal is ready
  const [paypalReady, setPaypalReady] = useState(false);

  // Load courses on component mount with better error handling
  useEffect(() => {
    let isMounted = true;
    
    const loadCourses = async () => {
      if (!isMounted) return;
      
      try {
        console.log('Starting to load courses...');
        const courses = await safeCheckCourses();
        if (isMounted) {
          console.log('Courses loaded successfully. Count:', courses.length);
        }
      } catch (error) {
        // Log but don't crash the app
        console.warn('Unexpected error in course loading:', error);
      }
    };

    // Use a small timeout to prevent blocking the initial render
    const timer = setTimeout(loadCourses, 100);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Load PayPal script with retry mechanism
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    let script: HTMLScriptElement | null = null;
    let retryTimeout: NodeJS.Timeout;

    const loadPayPal = () => {
      // Remove any existing script first
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }

      script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=test&currency=EUR&intent=capture&components=buttons&disable-funding=card`;
      script.async = true;
      
      script.onload = () => {
        console.log('PayPal script loaded successfully');
        setPaypalReady(true);
      };
      
      script.onerror = () => {
        console.warn('Failed to load PayPal script');
        if (retryCount < maxRetries) {
          const delay = 1000 * Math.pow(2, retryCount); // Exponential backoff
          retryCount++;
          console.log(`Retrying PayPal script load (${retryCount}/${maxRetries}) in ${delay}ms`);
          retryTimeout = setTimeout(loadPayPal, delay);
        } else {
          console.error('Max retries reached for PayPal script loading');
          setPaypalReady(false);
        }
      };

      document.body.appendChild(script);
    };

    loadPayPal();

    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  // Render a fallback UI if there was an initialization error
  if (initializationError) {
    return (
      <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
        <h1>Application Error</h1>
        <p>Sorry, something went wrong during initialization.</p>
        <p>Please try refreshing the page or contact support if the problem persists.</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            marginTop: '1rem'
          }}
        >
          Refresh Page
        </button>
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '2rem', padding: '1rem', background: '#fef2f2', color: '#991b1b' }}>
            <h3>Debug Information:</h3>
            <pre>{initializationError.toString()}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PayPalScriptProvider 
        options={{ 
          clientId: "test",
          currency: "EUR",
          intent: "capture",
          components: paypalReady ? 'buttons' : '',
          dataSdkIntegrationSource: 'integrationbuilder_sc'
        }}
        deferLoading={true}
      >
        <ErrorBoundary context="Auth provider error">
          <AuthProvider>
            <TooltipProvider>
              <Sonner />
              <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:courseId" element={<CourseDetailWrapper />} />
                <Route path="/courses/:courseId/assignments/:assignmentId/submit" element={<SubmitAssignmentPage />} />
                <Route path="/courses/:courseId/stream" element={<Navigate to="/courses/:courseId" replace />} />
                <Route path="/my-space" element={<MySpacePage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/menaxho" element={<Navigate to="/courses/f9d6cb51-15cf-4b57-aacc-6c0de3f1d6fe" replace />} />
                {/* Redirect from /instructor/dashboard to /dashboard for backward compatibility */}
                <Route path="/instructor/dashboard" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard/*" element={<DashboardLayout />}>
                  <Route index element={<DashboardOverview />} />
                  <Route path="courses">
                    <Route index element={<DashboardCourses />} />
                    <Route path=":courseId" element={<CourseManagementPage />} />
                  </Route>
                  <Route path="applications">
                    <Route index element={<ManageCourseApplications />} />
                    <Route path=":courseId" element={<ManageCourseApplications />} />
                  </Route>
                  <Route path="students" element={<DashboardStudents />} />
                  {/* Temporarily comment out DashboardQuestions route */}
                  {/* <Route path="questions" element={<DashboardQuestions />} /> */}
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
        </ErrorBoundary>
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
