import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export const PrivacyPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-cream/50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-playfair font-bold mb-6">
            Politika e Privatësisë
          </h1>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="prose max-w-none">
              <p className="mb-4">
                Në Knowly, ne vlerësojmë privatësinë tuaj dhe jemi të përkushtuar për të mbrojtur të dhënat tuaja personale.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Çfarë të dhënash mbledhim?</h2>
              <p className="mb-4">
                Ne mbledhim informacionin që ju na jepni kur regjistroheni në platformën tonë, si emri, adresa e emailit, dhe roli juaj (student ose instruktor).
                Gjithashtu, ne mbledhim të dhëna për përdorimin e platformës, përfshirë kurset që ndiqni ose krijoni.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Si i përdorim të dhënat tuaja?</h2>
              <p className="mb-4">
                Të dhënat tuaja përdoren për të:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Ofruar dhe përmirësuar shërbimet tona</li>
                <li>Personalizuar përvojën tuaj në platformë</li>
                <li>Komunikuar me ju për ndryshime ose përditësime</li>
                <li>Siguruar mbështetje teknike</li>
              </ul>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Si i mbrojmë të dhënat tuaja?</h2>
              <p className="mb-4">
                Ne zbatojmë masa të përshtatshme teknike dhe organizative për të mbrojtur të dhënat tuaja personale nga humbja, keqpërdorimi, aksesi i paautorizuar, ndryshimi ose zbulimi.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Ndarja e të dhënave me palë të treta</h2>
              <p className="mb-4">
                Ne nuk shesim, tregtojmë, ose transferojmë të dhënat tuaja personale te palë të treta pa pëlqimin tuaj, përveç rasteve kur është e nevojshme për të ofruar shërbimet tona ose kur kërkohet me ligj.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Ndryshimet në politikën e privatësisë</h2>
              <p className="mb-4">
                Ne mund të përditësojmë politikën tonë të privatësisë herë pas here. Ndryshimet do të publikohen në këtë faqe dhe, nëse janë të rëndësishme, do t'ju njoftojmë me email.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Kontaktoni me ne</h2>
              <p className="mb-4">
                Nëse keni pyetje rreth politikës sonë të privatësisë, ju lutemi na kontaktoni në <a href="mailto:info@knowly.com" className="text-gold hover:underline">info@knowly.com</a>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPage;
