
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { CoursesSection } from "../components/CoursesSection";
import { MySpaceSection } from "../components/MySpaceSection";
import { useAuth } from '@/hooks/useAuth';

const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <Hero />
        <CoursesSection />
        {user?.role === 'student' && <MySpaceSection />}
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
