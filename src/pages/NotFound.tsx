
import { useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow flex items-center justify-center bg-cream">
        <div className="text-center px-4">
          <h1 className="text-5xl font-playfair font-bold text-brown-dark mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-6">Faqja nuk u gjet</p>
          <p className="mb-8">Faqja që kërkuat nuk ekziston ose është zhvendosur.</p>
          <Link to="/" className="btn btn-primary">
            Kthehu tek Kryefaqja
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
