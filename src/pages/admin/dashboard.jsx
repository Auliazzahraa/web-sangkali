import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db, storage } from "../../services/firebase";
import { ref, uploadBytes } from "firebase/storage";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import ExcelUpload from "./excelUpload";
import { Link } from "react-router-dom";
import {onAuthStateChanged } from "firebase/auth";
import GoogleDriveLogin from "../../drivers/GoogleDriveLogin"; // sesuaikan path


export default function Dashboard() {
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileData, setFileData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
  const auth = getAuth();

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      setUserName(user.displayName || "User");

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setRole(userData.role || "pegawai");

          // ⛔️ Proteksi: jika bukan admin, tendang ke /home
          if (userData.role !== "admin") {
            navigate("/home");
          }
        }
      } catch (err) {
        console.error("❌ Gagal mengambil data role:", err);
      }
    } else {
      navigate("/login");
    }
  });

  // Cleanup
  return () => unsubscribe();
}, [navigate]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);

    // Upload ke Firebase Storage
    const storageRef = ref(storage, `uploads/${file.name}`);
    await uploadBytes(storageRef, file);

    // Baca isi XLSX-nya
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      setFileData(json.slice(0, 5)); // hanya preview 5 data
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md px-6 py-8">
        <div className="text-xl font-bold mb-10">📦 GOODPROG</div>

        <nav className="space-y-2">
            <Link
                to="/dashboard"
                className="block text-blue-600 font-medium py-2 px-4 bg-blue-100 rounded"
            >
            Dashboard
            </Link>

            <Link
                to="/jadwal"
                className="block text-gray-700 hover:bg-gray-100 py-2 px-4 rounded"
            >
            Jadwal
            </Link>
            <Link
              to="/admin-lihat-bukti"
              className="block text-gray-700 hover:bg-gray-100 py-2 px-4 rounded"
            >
              Lihat Bukti Kegiatan
            </Link>
        </nav>

        <div className="mt-10 text-gray-400 text-xs uppercase">Others</div>
        <nav className="mt-2">
            <Link
            to="/edit-profile"
            className="block text-gray-700 hover:bg-gray-100 py-2 px-4 rounded"
            >
            Accounts
            </Link>
        </nav>
    </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <input
            type="text"
            placeholder="Search"
            className="w-1/3 border border-gray-300 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-3">
            <span className="text-gray-700 font-medium">{userName} 👤</span>
          </div>
        </div>

        {/* Greeting */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Halo, {userName}! 👋</h1>

        {/* Upload Section */}
        <div className="p-10">
            <h1 className="text-xl font-bold mb-4">Upload Jadwal Excel</h1>
            <ExcelUpload />
        </div>

        <div className="mb-4">
          <GoogleDriveLogin />
        </div>
      </main>
    </div>
  );
}
