import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export const TermsPage = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-cream/50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-playfair font-bold mb-6">
            Kushtet e Shërbimit
          </h1>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="prose max-w-none">
              <p className="mb-4">
                Mirë se vini në Knowly! Këto kushte shërbimi përcaktojnë rregullat dhe rregulloret për përdorimin e platformës sonë.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Pranimi i kushteve</h2>
              <p className="mb-4">
                Duke përdorur platformën tonë, ju pranoni të respektoni këto kushte shërbimi. Nëse nuk pajtoheni me ndonjë nga këto kushte, ju lutemi mos e përdorni platformën tonë.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Llogaritë e përdoruesve</h2>
              <p className="mb-4">
                Kur krijoni një llogari në platformën tonë, ju jeni përgjegjës për ruajtjen e sigurisë së llogarisë suaj dhe për të gjitha aktivitetet që ndodhin nën llogarinë tuaj.
                Ju duhet të na njoftoni menjëherë për çdo përdorim të paautorizuar të llogarisë suaj ose për çdo shkelje të sigurisë.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Përmbajtja e përdoruesit</h2>
              <p className="mb-4">
                Përdoruesit mund të publikojnë përmbajtje në platformën tonë. Ju jeni përgjegjës për përmbajtjen që publikoni dhe duhet të siguroheni që ajo:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Nuk shkel të drejtat e autorit ose pronësinë intelektuale të të tjerëve</li>
                <li>Nuk është e paligjshme, abuzive, kërcënuese, shpifëse, ose në ndonjë mënyrë tjetër të papërshtatshme</li>
                <li>Nuk përmban viruse ose kode të dëmshme</li>
              </ul>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Pagesat dhe rimbursime</h2>
              <p className="mb-4">
                Disa kurse në platformën tonë kërkojnë pagesë. Të gjitha pagesat janë të pakthyeshme, përveç nëse përcaktohet ndryshe në politikën tonë të rimbursimit.
                Ne rezervojmë të drejtën për të ndryshuar çmimet e kurseve në çdo kohë.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Ndërprerja e shërbimit</h2>
              <p className="mb-4">
                Ne rezervojmë të drejtën për të ndërprerë ose pezulluar llogarinë tuaj dhe aksesin në platformën tonë në çdo kohë, pa paralajmërim ose përgjegjësi, për çdo arsye, përfshirë, por pa u kufizuar në, shkeljen e këtyre kushteve të shërbimit.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Ndryshimet në kushtet e shërbimit</h2>
              <p className="mb-4">
                Ne rezervojmë të drejtën për të modifikuar ose zëvendësuar këto kushte shërbimi në çdo kohë. Ndryshimet do të publikohen në këtë faqe dhe, nëse janë të rëndësishme, do t'ju njoftojmë me email.
              </p>
              
              <h2 className="text-xl font-playfair font-bold mt-6 mb-3">Kontaktoni me ne</h2>
              <p className="mb-4">
                Nëse keni pyetje rreth kushteve tona të shërbimit, ju lutemi na kontaktoni në <a href="mailto:info@knowly.com" className="text-gold hover:underline">info@knowly.com</a>.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;
