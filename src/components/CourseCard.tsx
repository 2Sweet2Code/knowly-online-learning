import { Link } from "react-router-dom";
import { Course } from "../types";
import { Users, BookOpen, Key } from "lucide-react";
import { useAuth } from "../context/AuthContext";
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
      
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', course.id)
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (error) throw error;
        
        setIsEnrolled(!!data);
      } catch (error) {
        console.error('Error checking enrollment:', error);
        // If there's an error, default to not showing access code
        setIsEnrolled(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkEnrollment();
  }, [user, course.id]);
  
  const isInstructor = course.instructor_id === user?.id;
  const showAccessCode = (isEnrolled || isInstructor) && !isLoading;
  const accessCode = course.accessCode || course.access_code;
  
  // Use a local fallback image instead of external placeholder
  const placeholderImage = "/fallback-image.png";
  
  return (
    <Link to={`/courses/${course.id}`} className="block bg-white border border-lightGray rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
      <div className="h-44 bg-cream overflow-hidden"> {/* Ensure background color shows if image fails */}
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
          <div className="mb-2">
            <div className="inline-flex items-center text-sm font-medium text-brown-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
              <Key className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span className="font-semibold">Kodi i aksesit:</span>
              <span className="ml-1.5 font-mono bg-white px-2 py-0.5 rounded border border-amber-200">
                {accessCode}
              </span>
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  navigator.clipboard.writeText(accessCode);
                  // You might want to add a toast notification here
                }}
                className="ml-2 text-amber-600 hover:text-brown-800 transition-colors"
                title="Kopjo kodin"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        )}
        <h3 className="text-xl font-playfair font-bold mb-2">
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
    </Link>
  );
};
