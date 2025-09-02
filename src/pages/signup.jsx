import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logopkm.png";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export default function SignUp() {
  const navigate = useNavigate();
  const [nip, setNip] = useState("");
  //const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      return setErrorMsg("Password dan konfirmasi tidak cocok");
    }

    try {
      const pendingDocRef = doc(db, "users_pending", nip);
      const pendingDocSnap = await getDoc(pendingDocRef);

      if (!pendingDocSnap.exists()) {
        return setErrorMsg("NIP tidak ditemukan atau tidak terdaftar.");
      }

      const pendingData = pendingDocSnap.data();

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, {
        displayName: pendingData.nama,
      });

      await setDoc(doc(db, "users", userCredential.user.uid), {
        nip: nip,
        nama: pendingData.nama,
        jabatan: pendingData.jabatan,
        role: pendingData.role || "pegawai",
        email: email,
        createdAt: new Date().toISOString(),
      });

      // Optionally delete from users_pending if you want one-time registration
      // await deleteDoc(pendingDocRef);
      navigate("/");
    } catch (error) {
      console.error("Signup error:", error);
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-black/40" style={{ backgroundImage: "url('/BG LOGIN.png')" }}>
      <div className="relative bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <img src={logo} alt="Logo" className="w-32 h-32 p-2" />
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-800 mt-20">Sign Up</h2>
        <p className="text-sm text-center text-gray-500 mb-4">Silakan daftar menggunakan NIP</p>

        {errorMsg && <div className="text-red-600 text-sm text-center mb-4">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">NIP</label>
            <input type="text" value={nip} onChange={(e) => setNip(e.target.value)} required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Masukkan NIP" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Masukkan Email" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Password (6-10 karakter)" />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">Konfirmasi Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Ulangi Password" />
          </div>

          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-full transition">
            Daftar
          </button>

          <p className="text-sm text-center text-gray-600 mt-4">
            Sudah punya akun?{' '}
            <span className="text-green-700 font-semibold hover:underline cursor-pointer" onClick={() => navigate('/')}>
              Login
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
