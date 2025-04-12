import { useState } from "react";
import { CourseCard } from "./CourseCard";
import { Course } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

const fetchCourses = async (category: string) => {
  let query = supabase.from('courses').select('*').eq('status', 'active');
  
  if (category !== 'all') {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error("Error fetching public courses:", error);
    throw error;
  }
  
  if (!data) return [];

  return data.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description,
    image: course.image,
    category: course.category as 'programim' | 'dizajn' | 'marketing' | 'other',
    instructor: course.instructor,
    instructorId: course.instructor_id,
    students: course.students || 0,
    status: course.status as 'active' | 'draft',
    price: course.price || 0,
    isPaid: !!course.isPaid,
    accessCode: course.accessCode,
    created_at: course.created_at,
    updated_at: course.updated_at
  }));
};

export const CoursesSection = () => {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: courses = [], isLoading, isError, error } = useQuery<Course[], Error>({
    queryKey: ['publicCourses', activeFilter],
    queryFn: () => fetchCourses(activeFilter),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  return (
    <section id="courses" className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-playfair font-bold text-center mb-10">Eksploro Kurset Tona</h2>
        
        <div className="text-center mb-10">
          <span className="text-brown">Filtro sipas: </span>
          <button
            className={`mx-2 pb-1 ${activeFilter === "all" ? "font-semibold border-b-2 border-gold" : "hover:text-brown-dark"}`}
            onClick={() => handleFilterChange("all")}
          >
            Të gjitha
          </button>
          <span className="text-gray-400">|</span>
          <button
            className={`mx-2 pb-1 ${activeFilter === "programim" ? "font-semibold border-b-2 border-gold" : "hover:text-brown-dark"}`}
            onClick={() => handleFilterChange("programim")}
          >
            Programim
          </button>
          <span className="text-gray-400">|</span>
          <button
            className={`mx-2 pb-1 ${activeFilter === "dizajn" ? "font-semibold border-b-2 border-gold" : "hover:text-brown-dark"}`}
            onClick={() => handleFilterChange("dizajn")}
          >
            Dizajn
          </button>
          <span className="text-gray-400">|</span>
          <button
            className={`mx-2 pb-1 ${activeFilter === "marketing" ? "font-semibold border-b-2 border-gold" : "hover:text-brown-dark"}`}
            onClick={() => handleFilterChange("marketing")}
          >
            Marketing
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brown border-r-transparent" role="status">
              <span className="sr-only">Po ngarkohet...</span>
            </div>
            <p className="mt-2 text-brown">Po ngarkohen kurset...</p>
          </div>
        ) : (
          isError ? (
            <div className="text-center py-10 bg-red-50 border border-red-200 rounded-lg p-6">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
              <h4 className="text-lg font-semibold text-red-700 mb-2">Gabim gjatë ngarkimit të kurseve</h4>
              <p className="text-red-600 mb-4">
                {error?.message || "Ndodhi një gabim i papritur. Ju lutemi provoni përsëri më vonë."}
              </p>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => queryClient.refetchQueries({ queryKey: ['publicCourses', activeFilter] })}
              >
                Provo Përsëri
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))
              ) : (
                <div className="col-span-full text-center py-10 text-gray-600">
                  Nuk u gjetën kurse aktive në këtë kategori.
                </div>
              )}
            </div>
          )
        )}
      </div>
    </section>
  );
};
