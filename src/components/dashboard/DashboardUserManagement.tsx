
export const DashboardUserManagement = () => {
  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Menaxhimi i Përdoruesve (Admin)
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <p className="mb-6">
          Këtu administratori mund të shikojë, modifikojë, ose fshijë llogari përdoruesish (studentë, instruktorë).
        </p>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-cream">
              <tr>
                <th className="border border-lightGray p-3 text-left">Emri</th>
                <th className="border border-lightGray p-3 text-left">Email</th>
                <th className="border border-lightGray p-3 text-left">Roli</th>
                <th className="border border-lightGray p-3 text-left">Statusi</th>
                <th className="border border-lightGray p-3 text-left">Veprime</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-lightGray p-3">Ana Koci</td>
                <td className="border border-lightGray p-3">ana.k@email.com</td>
                <td className="border border-lightGray p-3">Instruktor</td>
                <td className="border border-lightGray p-3">
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Aktiv</span>
                </td>
                <td className="border border-lightGray p-3">
                  <div className="flex space-x-2">
                    <button className="btn btn-secondary btn-sm">Modifiko</button>
                    <button className="btn btn-danger btn-sm">Blloko</button>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-lightGray p-3">Albi Deda</td>
                <td className="border border-lightGray p-3">albi.d@email.com</td>
                <td className="border border-lightGray p-3">Student</td>
                <td className="border border-lightGray p-3">
                  <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Aktiv</span>
                </td>
                <td className="border border-lightGray p-3">
                  <div className="flex space-x-2">
                    <button className="btn btn-secondary btn-sm">Modifiko</button>
                    <button className="btn btn-danger btn-sm">Blloko</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
