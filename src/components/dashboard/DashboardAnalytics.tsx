
export const DashboardAnalytics = () => {
  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Analitika e Kurseve
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Performanca e Përgjithshme
        </h4>
        
        <p className="mb-6">
          Këtu do të shfaqeshin grafike dhe statistika për regjistrimet, përfundimin e kurseve, angazhimin e studentëve, etj.
        </p>
        
        <div className="border border-lightGray bg-cream aspect-video flex items-center justify-center text-brown">
          <p className="text-center">
            <span className="block text-2xl mb-2">📊</span>
            Grafik Analitike (Placeholder)
          </p>
        </div>
      </div>
    </div>
  );
};
