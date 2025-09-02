import { useEffect, useState } from "react";
import { FaHome, FaCalendarAlt, FaUser, FaSignOutAlt, FaBars, FaTimes } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../services/firebase";
import { doc, getDoc} from "firebase/firestore";
import dayjs from "dayjs";


export default function Sidebar({ children }) {
  const [userData, setUserData] = useState(null);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth()

  // Handle Logout
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  useEffect(() => {

    setSidebarOpen(true);
    const timer = setTimeout(() => {
      setSidebarOpen(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const uid = user.uid;

        // Ambil profil dari Firestore
        const userDocRef = doc(db, "users", uid);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) return;

        const userProfile = {
          displayName: user.displayName,
          photoURL: user.photoURL || "/profilepict.png",
          ...userSnap.data(),
        };
        setUserData(userProfile);
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, []);

  const menuItems = [
    { label: "Home", path: "/home", icon: <FaHome /> },
    { label: "Jadwal", path: "/bukti-kegiatan", icon: <FaCalendarAlt /> },
    { label: "Profile", path: "/edit-profile", icon: <FaUser /> },
  ];

  return (
    <div className="flex">
      <div
        className={`fixed left-0 top-0 h-screen bg-[#E6F0E9] text-[#006106] p-4 transition-all duration-300 flex flex-col ${
          sidebarOpen ? "w-64" : "w-16"
        }`}
      >
        <div>
          {/* Tombol buka/tutup */}
          <div className="flex justify-end mb-4 mr-1.5">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          </div>

          {/* Profile Section */}
          {/* {sidebarOpen && (
            <div className="flex flex-col items-center mb-6 sm:items-start sm:flex-row gap-4 bg-white p-4 rounded-2xl shadow">
              <img
                src={userData.photoURL}
                alt="Foto Profil"
                className="w-16 h-16 rounded-full object-cover"
              />
              <div className="text-center sm:text-left">
                <h2 className="text-lg font-bold">{userData.displayName}</h2>
                <p className="text-gray-600 text-sm">NIP : {userData.nip || "-"}</p>
                <p className="text-gray-600 text-sm">
                  Jabatan : {userData.jabatan || "-"}
                </p>
              </div>
            </div>
          )} */}

          {/* Menu Section */}
          <div>
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-3 w-full px-2 py-3 rounded-lg mb-2 hover:bg-[#006106]/10 transition ${
                  location.pathname === item.path
                    ? "bg-[#006106]/10 font-semibold"
                    : ""
                }`}
              >
                {item.icon}
                {sidebarOpen && item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logout di pojok kiri bawah */}
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-2 py-3 rounded-lg hover:bg-red-100 text-red-600 transition"
          >
            <FaSignOutAlt />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </div>
      {/* Main content area */}
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-16"
        }`}
      >
        {children}
      </div>
    </div>
    
  );
};
