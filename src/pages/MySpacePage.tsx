
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { MySpaceSection } from "../components/MySpaceSection";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const MySpacePage = () => {
  const { user, isLoading } = useAuth();

  // Redirect if not authenticated
  if (!isLoading && !user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="bg-brown text-cream py-12 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-white mb-4">
              Hapësira Ime
            </h1>
            <p className="text-lg max-w-2xl mx-auto">
              Menaxhoni kurset, progresin dhe materialet tuaja të mësimit.
            </p>
          </div>
        </div>
        <MySpaceSection />
      </main>
      <Footer />
    </div>
  );
};

export default MySpacePage;
