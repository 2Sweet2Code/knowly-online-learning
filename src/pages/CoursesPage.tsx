
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { CoursesSection } from "../components/CoursesSection";

const CoursesPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="bg-brown text-cream py-12 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-white mb-4">
              Kurset Tona
            </h1>
            <p className="text-lg max-w-2xl mx-auto">
              Eksploro kurset tona të kategorive të ndryshme për të zhvilluar aftësitë tuaja profesionale.
            </p>
          </div>
        </div>
        <CoursesSection />
      </main>
      <Footer />
    </div>
  );
};

export default CoursesPage;
