import { Link } from "react-router-dom";
import { Course } from "../types";
import { Users, BookOpen } from "lucide-react";

interface CourseCardProps {
  course: Course;
}

export const CourseCard = ({ course }: CourseCardProps) => {
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
