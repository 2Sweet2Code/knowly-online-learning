
import { Course, Enrollment } from '../types';

// These functions would typically make actual API calls to your PHP backend
// For now, they'll work with mock data

// Mock data for courses
const MOCK_COURSES: Course[] = [
  {
    id: '1',
    title: 'Hyrje në Programim me Python',
    description: 'Mësoni bazat thelbësore të gjuhës Python, ideale për fillestarët në botën e kodimit.',
    image: 'https://placehold.co/600x360/5C4B3A/F5F0E6?text=Python+Kurs',
    category: 'programim',
    instructor: 'Ana Koci',
    instructorId: '101',
    students: 50,
    status: 'active',
  },
  {
    id: '2',
    title: 'Bazat e Dizajnit Grafik me Figma',
    description: 'Krijoni ndërfaqe përdoruesi (UI) moderne dhe prototipe interaktive duke përdorur mjetin popullor Figma.',
    image: 'https://placehold.co/600x360/3E2D21/F5F0E6?text=Figma+Dizajn',
    category: 'dizajn',
    instructor: 'Besi Leka',
    instructorId: '102',
    students: 35,
    status: 'active',
  },
  {
    id: '3',
    title: 'Marketing Dixhital për Fillestarë',
    description: 'Zbulo strategjitë kyçe të marketingut online: SEO, mediat sociale, email marketing dhe më shumë.',
    image: 'https://placehold.co/600x360/D4AF37/3E2D21?text=Marketing+Dixhital',
    category: 'marketing',
    instructor: 'Drini Malaj',
    instructorId: '103',
    students: 75,
    status: 'active',
  },
  {
    id: '4',
    title: 'React.js: Ndërto Aplikacione Web',
    description: 'Thellohuni në librarinë React për të krijuar UI interaktive dhe efikase për aplikacionet moderne web.',
    image: 'https://placehold.co/600x360/5C4B3A/FFFFFF?text=React.js',
    category: 'programim',
    instructor: 'Era Bisha',
    instructorId: '104',
    students: 25,
    status: 'active',
  },
  {
    id: '5',
    title: 'Principet Themelore të UI/UX Dizajnit',
    description: 'Mësoni principet kryesore për të krijuar eksperienca dixhitale intuitive dhe tërheqëse për përdoruesit.',
    image: 'https://placehold.co/600x360/3E2D21/F5F0E6?text=UI/UX+Principet',
    category: 'dizajn',
    instructor: 'Genta Muka',
    instructorId: '105',
    students: 40,
    status: 'active',
  }
];

// Mock data for enrollments
const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: '1',
    courseId: '1',
    userId: '1',
    progress: 45,
    completed: false,
  },
  {
    id: '2',
    courseId: '2',
    userId: '1',
    progress: 20,
    completed: false,
  }
];

// Course API functions
export const getCourses = async (): Promise<Course[]> => {
  // In a real app, this would be a fetch call to your PHP backend
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_COURSES), 500);
  });
};

export const getCoursesByCategory = async (category: string): Promise<Course[]> => {
  return new Promise((resolve) => {
    const filteredCourses = category === 'all' 
      ? MOCK_COURSES 
      : MOCK_COURSES.filter(course => course.category === category);
    setTimeout(() => resolve(filteredCourses), 300);
  });
};

export const getInstructorCourses = async (instructorId: string): Promise<Course[]> => {
  return new Promise((resolve) => {
    const courses = MOCK_COURSES.filter(course => course.instructorId === instructorId);
    setTimeout(() => resolve(courses), 300);
  });
};

export const createCourse = async (courseData: Omit<Course, 'id' | 'students' | 'status'>): Promise<Course> => {
  return new Promise((resolve) => {
    const newCourse: Course = {
      ...courseData,
      id: Math.random().toString(36).substring(7),
      students: 0,
      status: 'draft',
    };
    
    // In a real app, this would add to the database
    setTimeout(() => resolve(newCourse), 500);
  });
};

// Enrollment API functions
export const getUserEnrollments = async (userId: string): Promise<Enrollment[]> => {
  return new Promise((resolve) => {
    const enrollments = MOCK_ENROLLMENTS.filter(enrollment => enrollment.userId === userId);
    setTimeout(() => resolve(enrollments), 300);
  });
};

export const enrollInCourse = async (userId: string, courseId: string): Promise<Enrollment> => {
  return new Promise((resolve) => {
    const newEnrollment: Enrollment = {
      id: Math.random().toString(36).substring(7),
      courseId,
      userId,
      progress: 0,
      completed: false,
    };
    
    // In a real app, this would add to the database
    setTimeout(() => resolve(newEnrollment), 500);
  });
};
