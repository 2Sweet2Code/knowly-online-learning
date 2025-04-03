
import { Link } from "react-router-dom";
import { Course } from "../types";

interface CourseCardProps {
  course: Course;
}

export const CourseCard = ({ course }: CourseCardProps) => {
  return (
    <div className="bg-white border border-lightGray rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
      <div className="h-44 bg-brown overflow-hidden">
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-5 flex flex-col h-56">
        <h3 className="text-xl font-playfair font-bold mb-2">{course.title}</h3>
        <p className="text-sm text-gray-600 flex-grow mb-4">
          {course.description}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-brown">nga: {course.instructor}</span>
          <Link to={`/courses/${course.id}`} className="btn btn-primary text-sm">
            Regjistrohu
          </Link>
        </div>
      </div>
    </div>
  );
};
