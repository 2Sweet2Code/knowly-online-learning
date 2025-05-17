import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Course } from '@/types';
import CourseDetailPage from '@/pages/CourseDetailPage';
import { Header } from './Header';
import { Footer } from './Footer';
import { Loader2 } from 'lucide-react';

/**
 * A wrapper component for CourseDetailPage that safely handles initialization
 * This prevents the "Cannot access 'x' before initialization" error
 */
const CourseDetailWrapper: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [courseData, setCourseData] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch the course data first, before rendering the actual component
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) {
        setError('No course ID provided');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (error) {
          console.error('Error fetching course:', error);
          setError('Ky kurs nuk u gjet ose nuk ekziston më.');
        } else if (data) {
          // Transform the data to match the Course type
          const course: Course = {
            id: data.id,
            title: data.title,
            description: data.description,
            image: data.image,
            category: (data.category as 'programim' | 'dizajn' | 'marketing' | 'other') || 'other',
            instructor: data.instructor,
            instructorId: data.instructor_id,
            students: data.students || 0,
            status: (data.status as 'active' | 'draft') || 'draft',
            price: data.price,
            isPaid: !!data.isPaid,
            created_at: data.created_at,
            updated_at: data.updated_at,
            accessCode: data.accessCode
          };
          
          setCourseData(course);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Ndodhi një gabim i papritur. Ju lutemi provoni përsëri.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourseData();
  }, [courseId]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-brown" />
            <p className="text-lg text-brown">Po ngarkohet kursi...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow flex items-center justify-center bg-cream">
          <div className="bg-white p-10 rounded shadow text-center">
            <h1 className="text-2xl font-bold mb-2">Gabim gjatë ngarkimit të kursit</h1>
            <p className="mb-4">{error}</p>
            <button 
              className="btn btn-primary" 
              onClick={() => window.location.reload()}
            >
              Provo Përsëri
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If we have course data and no errors, render the actual course detail page
  // We're passing the pre-fetched data to avoid the initialization error
  return <CourseDetailPage initialCourseData={courseData} />;
};

export default CourseDetailWrapper;
