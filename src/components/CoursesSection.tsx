
import { useState, useEffect } from "react";
import { CourseCard } from "./CourseCard";
import { Course } from "../types";
import { getCoursesByCategory } from "../api";
import { useToast } from "@/hooks/use-toast";

export const CoursesSection = () => {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setIsLoading(true);
        const data = await getCoursesByCategory(activeFilter);
        setCourses(data);
      } catch (error) {
        console.error("Failed to fetch courses", error);
        toast({
          title: "Gabim",
          description: "Ndodhi një gabim gjatë ngarkimit të kurseve. Ju lutemi provoni përsëri.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCourses();
  }, [activeFilter, toast]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
            {courses.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-600">
                Nuk ka kurse në kategorinë e zgjedhur.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
