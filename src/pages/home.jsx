import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

export default function Home() {
  const auth = getAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setDisplayName(user.displayName || "User");
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe(); // cleanup listener saat komponen unmount
  }, [auth, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout gagal:", error);
    }
  };

  const goToEdit = () => {
    navigate("/edit-profile");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-6 text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">
        Halo, {displayName}! 👋
      </h1>

      <div className="flex gap-4">
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-2 rounded"
        >
          Logout
        </button>
        <button
          onClick={goToEdit}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-2 rounded"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
}
