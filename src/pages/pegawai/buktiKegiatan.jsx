import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function BuktiKegiatan() {
  const [jadwal, setJadwal] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const acceptedImageTypes = ["image/jpeg", "image/jpg", "image/png"];
  const acceptedDocTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  // 🔒 Auth dan ambil data
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return navigate("/login");

      const displayName = user.displayName;
      try {
        const q = query(
          collection(db, "jadwal", "juli-2025", "entries"),
          where("PELAKSANA", "==", displayName)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setJadwal(data);
      } catch (err) {
        console.error("❌ Gagal ambil data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // 🔼 Upload ke backend (langsung ke Google Drive pusat)
  const handleUpload = async (e, id, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = acceptedImageTypes.includes(file.type);
    const isDoc = acceptedDocTypes.includes(file.type);
    const maxSize = field === "buktiGambar" ? 1 * 1024 * 1024 : 50 * 1024 * 1024;

    if (!isImage && !isDoc) return alert("❌ Format file tidak didukung");
    if (file.size > maxSize) return alert("❌ Ukuran file terlalu besar");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Ganti URL sesuai alamat backend Express kamu
      const response = await axios.post("http://localhost:3001/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const fileId = response.data.fileId;
      const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      const downloadUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;

      const finalUrl = isDoc ? downloadUrl : previewUrl;

      const entryRef = doc(db, "jadwal", "juli-2025", "entries", id);
      await updateDoc(entryRef, { [field]: finalUrl });

      setJadwal((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: finalUrl } : item
        )
      );

      alert("✅ Upload berhasil!");
    } catch (err) {
      console.error("❌ Upload error:", err);
      alert("Upload gagal");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Upload Bukti Kegiatan</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">No</th>
                <th className="border px-2 py-1">Tanggal</th>
                <th className="border px-2 py-1">Nama Kegiatan</th>
                <th className="border px-2 py-1">Pelaksana</th>
                <th className="border px-2 py-1">Bukti Gambar</th>
                <th className="border px-2 py-1">Surat Lampiran</th>
              </tr>
            </thead>
            <tbody>
              {jadwal.map((item, idx) => (
                <tr key={item.id} className="text-center">
                  <td className="border px-2 py-1">{idx + 1}</td>
                  <td className="border px-2 py-1">
                    {item.TANGGAL?.toDate?.().toLocaleDateString("id-ID") || "-"}
                  </td>
                  <td className="border px-2 py-1">{item["NAMA KEGIATAN"] || "-"}</td>
                  <td className="border px-2 py-1">{item.PELAKSANA || "-"}</td>

                  {/* Upload Bukti Gambar */}
                  <td className="border px-2 py-1">
                    {item.buktiGambar ? (
                      <a
                        href={item.buktiGambar}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                      >
                        Lihat
                      </a>
                    ) : (
                      <div className="flex flex-col gap-1 items-center">
                        <label className="cursor-pointer text-blue-600 underline">
                          Pilih File
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUpload(e, item.id, "buktiGambar")}
                            hidden
                          />
                        </label>
                        <label className="cursor-pointer text-blue-600 underline">
                          Ambil Foto
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handleUpload(e, item.id, "buktiGambar")}
                            hidden
                          />
                        </label>
                      </div>
                    )}
                  </td>

                  {/* Upload Surat Lampiran */}
                  <td className="border px-2 py-1">
                    {item.suratLampiran ? (
                      <div className="flex flex-col items-center gap-1">
                        <a
                          href={`https://docs.google.com/viewerng/viewer?url=${item.suratLampiran}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-green-600 underline"
                        >
                          Preview
                        </a>
                        <a
                          href={item.suratLampiran}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline text-sm"
                          download
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleUpload(e, item.id, "suratLampiran")}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
