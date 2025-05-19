
import React, { useState } from 'react';
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { MySpaceSection } from "../components/MySpaceSection";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, GraduationCap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const MySpacePage = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = React.useState("courses");

  // Fetch enrolled courses with grades
  const { data: enrolledCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['student-enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      try {
        console.log('Fetching enrollments for user:', user.id);
        
        // Get all student enrollments for the user
        const { data: enrollments, error: enrollError } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('role', 'student'); // Only get student enrollments
        
        if (enrollError) {
          console.error('Error fetching enrollments:', enrollError);
          throw enrollError;
        }
        
        console.log('Found enrollments:', enrollments);
        
        if (!enrollments?.length) {
          console.log('No enrollments found for user');
          return [];
        }
        
        // Get course details for each enrollment
        const courseIds = enrollments.map(e => e.course_id);
        console.log('Fetching courses with IDs:', courseIds);
        
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds);
        
        if (coursesError) {
          console.error('Error fetching courses:', coursesError);
          throw coursesError;
        }
        
        console.log('Found courses:', courses);
        
        // Get grades for all enrolled courses
        const { data: grades = [], error: gradesError } = await supabase
          .from('student_grades')
          .select('*')
          .eq('user_id', user.id)
          .in('course_id', courseIds);
        
        if (gradesError) {
          console.error('Error fetching grades:', gradesError);
        } else {
          console.log('Found grades:', grades);
        }
        
        // Map the data to the expected format
        const result = enrollments.map(enrollment => {
          const course = courses.find(c => c.id === enrollment.course_id);
          if (!course) {
            console.warn('No course found for enrollment:', enrollment);
            return null;
          }
          
          const courseGrade = grades?.find(g => g.course_id === enrollment.course_id);
          
          return {
            id: course.id,
            title: course.title,
            description: course.description,
            image: course.image,
            category: course.category,
            instructor: course.instructor,
            instructor_id: course.instructor_id,
            status: course.status,
            created_at: course.created_at,
            updated_at: course.updated_at,
            enrollment_date: enrollment.created_at,
            grade: courseGrade?.grade || null,
            feedback: courseGrade?.feedback || null,
          };
        }).filter(Boolean); // Remove any null entries
        
        console.log('Mapped result:', result);
        return result;
      } catch (error) {
        console.error('Error fetching enrolled courses:', error);
        return [];
      }
    },
    enabled: !!user,
  });

  // Show loading skeleton while checking auth state or loading courses
  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="bg-brown text-cream py-12 text-center">
          <div className="container mx-auto px-4">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-cream p-6 rounded-lg border border-lightGray">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not a student
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'student') {
    return <Navigate to="/dashboard" />;
  }

  // Filter courses with grades for the grades tab
  const gradedCourses = enrolledCourses.filter(course => course.grade !== null);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="bg-brown text-cream py-12 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-white mb-4">
              Hapësira Ime
            </h1>
            <p className="text-lg max-w-2xl mx-auto">
              Shikoni kurset tuaja, progresin dhe notat.
            </p>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="courses" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 mx-auto">
              <TabsTrigger value="courses" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Kurset e mia
              </TabsTrigger>
              <TabsTrigger value="grades" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Notat
                {gradedCourses.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs">
                    {gradedCourses.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="courses">
              <MySpaceSection />
            </TabsContent>
            
            <TabsContent value="grades">
              {gradedCourses.length === 0 ? (
                <div className="text-center py-12">
                  <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">Nuk keni asnjë notë akoma</h3>
                  <p className="mt-1 text-sm text-gray-500">Notat tuaja do të shfaqen këtu pasi ti merrni ato.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gradedCourses.map((course) => (
                      <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-semibold">{course.title}</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              course.grade >= 85 ? 'bg-green-100 text-green-800' :
                              course.grade >= 70 ? 'bg-blue-100 text-blue-800' :
                              course.grade >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {course.grade}%
                            </span>
                          </div>
                          
                          {course.feedback && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                              <p className="text-sm font-medium text-blue-800 mb-1">Koment nga instruktori:</p>
                              <p className="text-sm text-gray-700 italic">"{course.feedback}"</p>
                            </div>
                          )}
                          
                          <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                            <span>Instruktor: {course.instructor}</span>
                            <span className="text-xs">
                              {new Date(course.enrollment_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="mt-4">
                            <a
                              href={`/courses/${course.id}`}
                              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brown hover:bg-brown-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brown"
                            >
                              Shiko Kursin
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MySpacePage;
