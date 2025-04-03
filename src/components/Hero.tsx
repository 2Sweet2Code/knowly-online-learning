
import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="bg-brown text-cream py-20 text-center">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-playfair font-bold text-white mb-4">
          Zhvillo Aftësitë e Tua, Kudo & Kurdo
        </h1>
        <p className="text-lg max-w-2xl mx-auto mb-8">
          Platforma e parë shqiptare me kurse cilësore online në programim, dizajn, marketing dhe më shumë. Fillo mësimin sot!
        </p>
        <Link to="/courses" className="btn btn-primary">
          Shfleto Kurset
        </Link>
      </div>
    </section>
  );
};
