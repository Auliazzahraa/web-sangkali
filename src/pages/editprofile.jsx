import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../services/firebase";
import {
  updateProfile,
  updatePassword,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

export default function EditProfile() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Ambil data dari Firestore
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    setDisplayName(user.displayName || "");

    const fetchUserData = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGender(data.gender || "");
        setBirthdate(data.birthdate || "");
      }
    };

    fetchUserData();
  }, [user, navigate]);

    const handleSave = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        const today = new Date();
        const birth = new Date(birthdate);
        const age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        const dayDiff = today.getDate() - birth.getDate();

        if (birth > today) {
            setError("Tanggal lahir tidak boleh dari masa depan.");
            return;
        }

        if (age < 15 || (age === 15 && monthDiff < 0) || (age === 15 && monthDiff === 0 && dayDiff < 0)) {
            setError("Umur minimal 15 tahun.");
            return;
        }

        try {
            // update displayName
            if (displayName !== user.displayName) {
            await updateProfile(user, { displayName });
            }

            await setDoc(doc(db, "users", user.uid), {
            displayName,
            gender,
            birthdate,
            }, { merge: true });

            setMessage("Profil berhasil diperbarui.");
        } catch (err) {
            setError("Gagal menyimpan: " + err.message);
        }
};

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 p-6">
        <button
            onClick={() => navigate("/home")}
            className="absolute top-6 left-6 text-gray-700 hover:text-green-600 flex items-center gap-1"
            >
            <span className="text-xl">←</span>
            <span className="text-sm font-medium">Beranda</span>
        </button>

      <div className="bg-white p-6 rounded shadow max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-center">Edit Profil</h2>
        {message && <p className="text-green-600 mb-2">{message}</p>}
        {error && <p className="text-red-600 mb-2">{error}</p>}
        {message && (
            <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded mb-4 text-sm">
                ✅ {message}
            </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Nama Lengkap
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Jenis Kelamin
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
              required
            >
              <option value="">Pilih jenis kelamin</option>
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Tanggal Lahir
            </label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
                Password Saat Ini
            </label>
            <input
                type="password"
                value="********"
                readOnly
                className="w-full border border-gray-300 px-3 py-2 rounded bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
                Password tidak bisa diubah di sini.
            </p>
        </div>


          <button
            type="submit"
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
          >
            Simpan Perubahan
          </button>
        </form>
      </div>
    </div>
  );
}
