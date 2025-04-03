
export const DashboardContentModeration = () => {
  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Moderimi i Përmbajtjes (Admin)
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <p className="mb-6">
          Këtu administratori mund të rishikojë dhe aprovojë kurse të reja, ose të moderojë diskutimet dhe komentet.
        </p>
        
        <h4 className="text-lg font-bold mb-3">
          Kurse në Pritje për Aprovim:
        </h4>
        
        <div className="space-y-4">
          <div className="p-4 border border-lightGray rounded-md bg-cream/50">
            <div className="flex justify-between items-start">
              <div>
                <h5 className="font-bold">Web Design për Fillestarë</h5>
                <p className="text-sm text-gray-600">Instruktor: Valmira Krasniqi</p>
                <p className="text-sm mt-2">Një kurs i ri për të mësuar bazat e dizajnit web, duke përfshirë HTML, CSS, dhe JavaScript.</p>
              </div>
              <div className="space-x-2">
                <button className="btn btn-primary btn-sm">Aprovo</button>
                <button className="btn btn-secondary btn-sm">Shiko Detaje</button>
                <button className="btn btn-danger btn-sm">Refuzo</button>
              </div>
            </div>
          </div>
          
          <div className="p-4 border border-lightGray rounded-md bg-cream/50">
            <div className="flex justify-between items-start">
              <div>
                <h5 className="font-bold">Excel për Biznese</h5>
                <p className="text-sm text-gray-600">Instruktor: Besnik Leka</p>
                <p className="text-sm mt-2">Një kurs praktik për përdorimin e Excel në analiza biznesi dhe menaxhim financiar.</p>
              </div>
              <div className="space-x-2">
                <button className="btn btn-primary btn-sm">Aprovo</button>
                <button className="btn btn-secondary btn-sm">Shiko Detaje</button>
                <button className="btn btn-danger btn-sm">Refuzo</button>
              </div>
            </div>
          </div>
        </div>
        
        <h4 className="text-lg font-bold mb-3 mt-8">
          Komente të Raportuara:
        </h4>
        
        <div className="space-y-4">
          <div className="p-4 border border-lightGray rounded-md bg-cream/50">
            <p className="italic text-gray-600">"Ky kurs është i padobishëm, nuk mësova asgjë të re dhe instruksionet janë shumë të paqarta. Mos e blini!"</p>
            <div className="flex justify-between items-center mt-2">
              <div className="text-sm">
                <span className="font-semibold">Nga:</span> Përdorues123 | 
                <span className="font-semibold"> Kursi:</span> Hyrje në Python
              </div>
              <div className="space-x-2">
                <button className="btn btn-secondary btn-sm">Lejo</button>
                <button className="btn btn-danger btn-sm">Fshij</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
