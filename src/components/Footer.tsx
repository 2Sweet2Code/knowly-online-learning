
import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-brown-dark text-cream py-10 mt-12">
      <div className="container mx-auto px-4 flex flex-col items-center text-center">
        <ul className="flex flex-wrap justify-center gap-6 mb-4">
          <li>
            <Link to="/privacy" className="text-cream hover:text-gold">
              Politika e Privatësisë
            </Link>
          </li>
          <li>
            <Link to="/terms" className="text-cream hover:text-gold">
              Kushtet e Shërbimit
            </Link>
          </li>
          <li>
            <Link to="/contact" className="text-cream hover:text-gold">
              Na Kontaktoni
            </Link>
          </li>
        </ul>
        <p className="text-sm opacity-80 mt-2">
          © {new Date().getFullYear()} Mëso Online. Të gjitha të drejtat e rezervuara.
        </p>
      </div>
    </footer>
  );
};
