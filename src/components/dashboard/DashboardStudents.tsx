
import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";

export const DashboardStudents = () => {
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState('all');
  
  // Sample student data
  const students = [
    {
      id: '1',
      name: 'Albi Deda',
      email: 'albi.d@email.com',
      courses: ['Python', 'React'],
    },
    {
      id: '2',
      name: 'Lira Shala',
      email: 'lira.s@email.com',
      courses: ['Marketing', 'Python'],
    },
    {
      id: '3',
      name: 'Bora Kalo',
      email: 'bora.k@email.com',
      courses: ['React'],
    },
  ];

  const handleViewProfile = (studentId: string) => {
    toast({
      title: "Profili i Studentit",
      description: "Po hapet profili i studentit.",
    });
  };

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
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="all">Të gjitha Kurset</option>
            <option value="Python">Hyrje në Programim me Python</option>
            <option value="React">React.js: Ndërto Aplikacione Web</option>
            <option value="Marketing">Marketing Digjital</option>
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
              {students
                .filter(student => selectedCourse === 'all' || student.courses.includes(selectedCourse))
                .map(student => (
                <tr key={student.id}>
                  <td className="border border-lightGray p-3">{student.name}</td>
                  <td className="border border-lightGray p-3">{student.email}</td>
                  <td className="border border-lightGray p-3">{student.courses.join(', ')}</td>
                  <td className="border border-lightGray p-3">
                    <button 
                      className="px-3 py-1 bg-brown text-white rounded hover:bg-brown-dark transition-colors"
                      onClick={() => handleViewProfile(student.id)}
                    >
                      Shiko Profilin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
