
export const DashboardSettings = () => {
  return (
    <div>
      <h3 className="text-2xl font-playfair mb-6 pb-3 border-b border-lightGray">
        Cilësimet e Llogarisë së Instruktorit
      </h3>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm mb-6">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Informacioni i Profilit
        </h4>
        
        <form>
          <div className="mb-4">
            <label htmlFor="inst-name" className="block mb-2 font-semibold text-brown">
              Emri:
            </label>
            <input 
              type="text" 
              id="inst-name" 
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown"
              defaultValue="Emri Juaj Instruktor"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="inst-bio" className="block mb-2 font-semibold text-brown">
              Bio e Shkurtër:
            </label>
            <textarea 
              id="inst-bio" 
              className="w-full px-4 py-3 border border-lightGray rounded-md focus:outline-none focus:border-brown focus:ring-1 focus:ring-brown min-h-[100px]"
              defaultValue="Instruktor me përvojë në [Fusha Juaj]."
            />
          </div>
          
          <button type="submit" className="btn btn-primary">
            Ruaj Ndryshimet
          </button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-lightGray shadow-sm">
        <h4 className="text-xl font-playfair font-bold mb-4">
          Cilësimet e Njoftimeve
        </h4>
        
        <p>
          Menaxho preferencat e email-it dhe njoftimeve të platformës.
        </p>
        
        <div className="mt-4 space-y-3">
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="notification-student-joined" 
              className="mr-2 h-4 w-4" 
              defaultChecked 
            />
            <label htmlFor="notification-student-joined">
              Merr njoftim kur një student regjistrohet në kurset tuaja
            </label>
          </div>
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="notification-new-comment" 
              className="mr-2 h-4 w-4" 
              defaultChecked 
            />
            <label htmlFor="notification-new-comment">
              Merr njoftim për komente të reja në kurset tuaja
            </label>
          </div>
          
          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="notification-platform-updates" 
              className="mr-2 h-4 w-4" 
              defaultChecked 
            />
            <label htmlFor="notification-platform-updates">
              Merr njoftim për përditësime të platformës
            </label>
          </div>
        </div>
        
        <div className="mt-6">
          <button className="btn btn-primary">
            Ruaj Preferencat
          </button>
        </div>
      </div>
    </div>
  );
};
