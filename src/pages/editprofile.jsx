import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "../services/firebase";
import Sidebar from "../assets/components/sidebar";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { Pencil, Trash2 } from "lucide-react";
import axios from "axios";
import imageCompression from "browser-image-compression";
import { toast } from "react-toastify";

export default function EditProfile() {
  const authInst = getAuth();
  const navigate = useNavigate();

  // user state
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);

  // profile data
  const [photoURL, setPhotoURL] = useState("");
  const [photoPublicId, setPhotoPublicId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nama, setName] = useState("");
  const [gender, setGender] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [nip, setNip] = useState("");
  const [email, setEmail] = useState("");

  // state UI
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({ nama: "", email: "" });

  // edit email modal
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");

  // ambil data user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authInst, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setLoading(false);
        navigate("/");
        return;
      }

      setCurrentUser(user);

      try {
        const docRef = doc(db, "users", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserData(data);
          setDisplayName(data.displayName || "");
          setName(data.nama || "");
          setGender(data.gender || "");
          setBirthdate(data.birthdate || "");
          setPhotoURL(data.photoURL || "");
          setPhotoPublicId(data.photoPublicId || "");
          setNip(data.nip || "");
          setEmail(data.email || "");
        }
      } catch (e) {
        console.error(e);
        setError("Gagal memuat profil.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // upload ke cloudinary
  const uploadToCloudinary = async (file) => {
    const url = "https://api.cloudinary.com/v1_1/dmdfgqk2h/image/upload";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "profile_foto");
    const response = await fetch(url, { method: "POST", body: formData });
    if (!response.ok) throw new Error("Gagal mengunggah gambar");
    const data = await response.json();
    return { url: data.secure_url, public_id: data.public_id };
  };

  // simpan profil
  const handleSaveProfile = async () => {
    if (!currentUser || !userData) return;
    if (!nama.trim()) {
      toast.error("Nama tidak boleh kosong");
      return;
    }
    try {
      setUploading(true);
      await setDoc(
        doc(db, "users", currentUser.uid),
        { nama, displayName, gender, birthdate, photoURL, photoPublicId, email },
        { merge: true }
      );
      toast.success("Profil berhasil diperbarui.");
    } catch (err) {
      console.error(err);
      toast.error("Gagal menyimpan profil: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // update email langsung
  const handleUpdateEmail = async () => {
    setError("");
    setSuccess("");

    try {
      if (!currentUser) throw new Error("User tidak login");

      // re-authenticate
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);

      // update email auth
      await updateEmail(currentUser, newEmail);

      // update firestore
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { email: newEmail });

      setEmail(newEmail);
      setSuccess("Email berhasil diganti!");
      setPassword("");
      setNewEmail("");
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  // hapus foto profil
  const handleDeleteProfilePhoto = async () => {
    if (!currentUser || !photoPublicId) return;
    try {
      setUploading(true);
      setMessage("⏳ Menghapus foto profil...");

      await axios.post("http://localhost:5000/delete-image", {
        publicId: photoPublicId,
      });

      await setDoc(
        doc(db, "users", currentUser.uid),
        { photoURL: "", photoPublicId: "" },
        { merge: true }
      );

      setPhotoURL("");
      setPhotoPublicId("");
      setMessage("✅ Foto profil berhasil dihapus.");
    } catch (err) {
      console.error("❌ Gagal hapus foto profil:", err);
      setError("Gagal hapus foto profil");
    } finally {
      setUploading(false);
    }
  };

  // upload foto
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploading(true);
      setMessage("⏳ Sedang mengunggah foto...");

      if (photoPublicId) {
        await axios.post("http://localhost:5000/delete-image", {
          publicId: photoPublicId,
        });
      }

      const options = { maxSizeMB: 1, maxWidthOrHeight: 800, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const { url, public_id } = await uploadToCloudinary(compressedFile);

      await setDoc(
        doc(db, "users", currentUser.uid),
        { photoURL: url, photoPublicId: public_id },
        { merge: true }
      );

      setPhotoURL(url);
      setPhotoPublicId(public_id);
      setMessage("✅ Foto berhasil diunggah!");
    } catch (err) {
      console.error(err);
      setError("❌ Gagal upload foto: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // form validation
  const handleNameChange = (value) => {
    setName(value);
    setDisplayName(value);
    if (!value.trim()) {
      setFormErrors((prev) => ({ ...prev, nama: "Nama tidak boleh kosong" }));
    } else {
      setFormErrors((prev) => ({ ...prev, nama: "" }));
    }
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setFormErrors((prev) => ({ ...prev, email: "Email tidak boleh kosong" }));
    } else if (!emailRegex.test(value)) {
      setFormErrors((prev) => ({ ...prev, email: "Format email tidak valid" }));
    } else {
      setFormErrors((prev) => ({ ...prev, email: "" }));
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!userData) return <div className="p-6 text-center">🔄 Memuat data...</div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col max-w-xl w-full mx-auto p-4 sm:p-6 bg-white rounded-2xl shadow">
        <h1 className="text-lg sm:text-xl font-bold mb-6">Profilku</h1>

        {message && <div className="p-2 mb-3 rounded bg-green-100 text-green-800 border border-green-300 text-sm">{message}</div>}
        {error && <div className="p-2 mb-3 rounded bg-red-100 text-red-800 border border-red-300 text-sm">{error}</div>}
        {success && <div className="p-2 mb-3 rounded bg-green-100 text-green-800 border border-green-300 text-sm">{success}</div>}

        {/* Foto */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto mb-6">
          {photoURL ? (
            <img src={photoURL} alt="Preview" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border" />
          ) : (
            <img src="/profilepict.png" alt="Placeholder" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border" />
          )}

          {/* Ganti foto */}
          <label className="absolute bottom-1 right-1 bg-[#006106] p-2 rounded-full cursor-pointer shadow">
            <Pencil className="w-4 h-4 text-white" />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>

          {/* Hapus foto */}
          {photoURL && (
            <button onClick={handleDeleteProfilePhoto} className="absolute top-1 right-1 bg-red-600 p-2 rounded-full shadow" disabled={uploading}>
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        {/* Nama */}
        <label className="block mb-2 text-sm">Nama Lengkap *</label>
        <input
          type="text"
          value={nama}
          onChange={(e) => handleNameChange(e.target.value)}
          className={`border p-2 w-full mb-1 rounded ${formErrors.nama ? "border-red-500" : ""}`}
        />
        {formErrors.nama && <p className="text-red-500 text-xs mb-3">{formErrors.nama}</p>}

        {/* NIP */}
        <label className="block mb-2 text-sm">NIP</label>
        <input type="text" value={nip} readOnly className="border p-2 w-full mb-4 rounded bg-gray-100 text-gray-600 cursor-not-allowed" />

        {/* Email */}
        <label className="block mb-2 text-sm">Email *</label>
        <input type="email" value={email} readOnly className="border p-2 w-full rounded mb-3" />

        {/* Edit email */}
        <div className="p-4 border rounded mb-4">
          <h2 className="text-lg font-bold mb-2">Ganti Email</h2>
          <input
            type="email"
            placeholder="Email baru"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="border p-2 rounded w-full mb-2"
          />
          <input
            type="password"
            placeholder="Password lama"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-2 rounded w-full mb-2"
          />
          <button onClick={handleUpdateEmail} className="bg-blue-500 text-white px-4 py-2 rounded">
            Update Email
          </button>
        </div>

        {/* Gender */}
        <label className="block mb-2 text-sm">Gender</label>
        <select value={gender} onChange={(e) => setGender(e.target.value)} className="border p-2 w-full mb-4 rounded">
          <option value="">Pilih Gender</option>
          <option value="Laki-laki">Laki-laki</option>
          <option value="Perempuan">Perempuan</option>
        </select>

        {/* Tanggal lahir */}
        <label className="block mb-2 text-sm">Tanggal Lahir</label>
        <input type="date" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} className="border p-2 w-full mb-6 rounded" />

        {/* Simpan */}
        <button onClick={handleSaveProfile} disabled={uploading} className="bg-[#006106] text-white px-4 py-2 rounded disabled:opacity-60 w-full">
          {uploading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
