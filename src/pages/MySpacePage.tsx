
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { MySpaceSection } from "../components/MySpaceSection";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const MySpacePage = () => {
  const { user, isLoading } = useAuth();

  // Show loading skeleton while checking auth state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <div className="bg-brown text-cream py-12 text-center">
          <div className="container mx-auto px-4">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-cream p-6 rounded-lg border border-lightGray">
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated or not a student
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== 'student') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="bg-brown text-cream py-12 text-center">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-white mb-4">
              Hapësira Ime
            </h1>
            <p className="text-lg max-w-2xl mx-auto">
              Shikoni kurset tuaja, progresin dhe notat.
            </p>
          </div>
        </div>
        <MySpaceSection />
      </main>
      <Footer />
    </div>
  );
};

export default MySpacePage;
