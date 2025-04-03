
export const DashboardStudents = () => {
  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Menaxhimi i Studentëve
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Lista e Studentëve
        </h4>
        
        <div className="mb-4">
          <label htmlFor="course-filter" className="block mb-2">Filtroni sipas kursit:</label>
          <select 
            id="course-filter" 
            className="px-4 py-2 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
          >
            <option>Të gjitha Kurset</option>
            <option>Hyrje në Programim me Python</option>
            <option>React.js: Ndërto Aplikacione Web</option>
          </select>
        </div>
        
        <div className="overflow-x-auto mt-4">
          <table className="w-full border-collapse">
            <thead className="bg-cream">
              <tr>
                <th className="border border-lightGray p-3 text-left">Emri</th>
                <th className="border border-lightGray p-3 text-left">Email</th>
                <th className="border border-lightGray p-3 text-left">Kurset e Regjistruara</th>
                <th className="border border-lightGray p-3 text-left">Veprime</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-lightGray p-3">Albi Deda</td>
                <td className="border border-lightGray p-3">albi.d@email.com</td>
                <td className="border border-lightGray p-3">Python, React</td>
                <td className="border border-lightGray p-3">
                  <button className="btn btn-secondary btn-sm">
                    Shiko Profilin
                  </button>
                </td>
              </tr>
              <tr>
                <td className="border border-lightGray p-3">Lira Shala</td>
                <td className="border border-lightGray p-3">lira.s@email.com</td>
                <td className="border border-lightGray p-3">Marketing, Python</td>
                <td className="border border-lightGray p-3">
                  <button className="btn btn-secondary btn-sm">
                    Shiko Profilin
                  </button>
                </td>
              </tr>
              <tr>
                <td className="border border-lightGray p-3">Bora Kalo</td>
                <td className="border border-lightGray p-3">bora.k@email.com</td>
                <td className="border border-lightGray p-3">React</td>
                <td className="border border-lightGray p-3">
                  <button className="btn btn-secondary btn-sm">
                    Shiko Profilin
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
