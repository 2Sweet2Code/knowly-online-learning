import { Link } from "react-router-dom";
import { Course } from "../types";
import { Users, BookOpen, Key } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CourseCardProps {
  course: Course;
}

export const CourseCard = ({ course }: CourseCardProps) => {
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Check enrollment status when component mounts
  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user) {
        setIsEnrolled(false);
        setIsLoading(false);
        return;
      }
      
      // If user is the instructor, they should see the access code
      if (course.instructor_id === user.id) {
        setIsEnrolled(true);
        setIsLoading(false);
        return;
      }

      try {
        // Check enrollment using the correct Supabase query
        const { data, error } = await supabase
          .from('enrollments')
          .select('*')
          .eq('course_id', course.id)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) {
          console.error('Error checking enrollment:', error);
          // If there's an error, we'll assume not enrolled to be safe
          setIsEnrolled(false);
        } else {
          // If data exists, user is enrolled
          setIsEnrolled(!!data);
        }
      } catch (error) {
        console.error('Error in enrollment check:', error);
        setIsEnrolled(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkEnrollment();
  }, [user, course.id, course.instructor_id]);
  
  const isInstructor = course.instructor_id === user?.id;
  const showAccessCode = (isEnrolled || isInstructor) && !isLoading;
  // Use the correct column name from the database schema (accessCode)
  const accessCode = course.accessCode;
  
  // Use a local fallback image instead of external placeholder
  const placeholderImage = "/fallback-image.png";
  
  return (
    <Link to={`/courses/${course.id}`} className="block bg-white border border-lightGray rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-1 h-full flex flex-col">
      <div className="h-48 bg-cream overflow-hidden"> {/* Increased height for better image display */}
        <img
          // Use course image if available, otherwise use placeholder
          src={course.image || placeholderImage} 
          alt={course.title}
          className="w-full h-full object-cover"
          // Optional: Add onError to fallback if course.image URL is broken
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== placeholderImage) { // Prevent infinite loop if placeholder fails
                 target.src = placeholderImage;
            }
          }}/>
      </div>
      <div className="p-5 flex flex-col h-56">
        <div className="flex items-center gap-2 mb-2">
          {course.isPaid && (
            <span className="px-2 py-0.5 bg-gold text-brown text-xs font-semibold rounded-full">
              Me pagesë
            </span>
          )}
          <span className="px-2 py-0.5 bg-cream text-brown text-xs font-semibold rounded-full">
            {course.category === 'programim' ? 'Programim' : 
             course.category === 'dizajn' ? 'Dizajn' : 
             course.category === 'marketing' ? 'Marketing' : 'Tjetër'}
          </span>
        </div>
        
        {showAccessCode && accessCode && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center text-sm font-medium text-amber-800">
                <Key className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="font-semibold">Kodi i aksesit</span>
              </div>
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-md border border-amber-200">
                <span className="font-mono text-base font-semibold text-amber-900">
                  {accessCode}
                </span>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigator.clipboard.writeText(accessCode);
                    // You might want to add a toast notification here
                  }}
                  className="ml-2 p-1.5 text-amber-500 hover:bg-amber-100 rounded-full transition-colors"
                  title="Kopjo kodin"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        <h3 className="text-xl font-playfair font-bold mb-2 mt-1">
          {course.title.replace(/\s*\[.*?\]\s*/, '')}
        </h3>
        <p className="text-sm text-gray-600 flex-grow mb-3">
          {course.description.length > 100 
            ? `${course.description.substring(0, 100)}...` 
            : course.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>{course.students} studentë</span>
          </div>
          <div className="flex items-center">
            <BookOpen className="h-4 w-4 mr-1" />
            <span>nga: {course.instructor}</span>
          </div>
        </div>
        
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {course.isPaid ? (
              <span className="font-bold text-brown">{course.price}€</span>
            ) : (
              <span className="font-bold text-green-600">Falas</span>
            )}
            <div className="btn btn-primary text-sm">
              Shiko Kursin
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
