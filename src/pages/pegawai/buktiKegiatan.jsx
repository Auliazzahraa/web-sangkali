import { useEffect, useState } from "react";
import {
  updateDoc,
  doc,
  getDocs,
  collection,
  query,
  where,
  getDoc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import { uploadToCloudinary } from "../../utills/uploadToCloudinary.js";
import { Search, Trash2 } from "lucide-react";
import Sidebar from "../../assets/components/sidebar";
import DataTable from "react-data-table-component";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { format } from "date-fns";
import { id } from "date-fns/locale";
dayjs.locale("id");

/* ===================== Helpers ===================== */
async function resolvePelaksana(jadwalEntries) {
  const allNip = [...new Set(jadwalEntries.flatMap(e => e.nipKegiatan || []))];
  const nipToNama = {};

  for (let i = 0; i < allNip.length; i += 10) {
    const batch = allNip.slice(i, i + 10);
    const q = query(collection(db, "users"), where("nip", "in", batch));
    const snap = await getDocs(q);
    snap.forEach(doc => {
      const d = doc.data();
      nipToNama[d.nip] = d.nama;
    });
  }

  return jadwalEntries.map(e => ({
    ...e,
    pelaksana: (e.nipKegiatan || []).map(nip => nipToNama[nip] || nip),
  }));
}


function getMonthYearKey(date = new Date()) {
  const months = [
    "januari", "februari", "maret", "april", "mei", "juni",
    "juli", "agustus", "september", "oktober", "november", "desember"
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${month}-${year}`; // contoh: "agustus-2025"
}

// "2025-08" -> "agustus-2025"
function getMonthYearKeyFromMonthString(ym) {
  if (!ym) return getMonthYearKey(new Date());
  const [year, monthStr] = ym.split("-");
  const months = [
    "januari","februari","maret","april","mei","juni",
    "juli","agustus","september","oktober","november","desember"
  ];
  const idx = Math.max(0, Math.min(11, parseInt(monthStr, 10) - 1));
  return `${months[idx]}-${year}`;
}

// Batas min/max untuk input type="date" sesuai bulan terpilih
function getMonthBounds(ym) {
  const start = dayjs(`${ym}-01`).startOf("month");
  const end = start.endOf("month");
  return {
    min: start.format("YYYY-MM-DD"),
    max: end.format("YYYY-MM-DD"),
  };
}

function LoadingOverlay({ message }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black bg-opacity-50">
      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      {message && <p className="mt-3 text-white font-medium">{message}</p>}
    </div>
  );
}

/* ===================== Component ===================== */
export default function BuktiKegiatan() {
  const navigate = useNavigate();

  // ------ State filter & search ------
  const [searchDalam, setSearchDalam] = useState("");
  const [searchLuar, setSearchLuar] = useState("");
  const [dateDalam, setDateDalam] = useState("");
  const [dateLuar, setDateLuar] = useState("");

  // overlay
  const [overlayColor, setOverlayColor] = useState("#ffffff"); // warna overlay
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [manualOverlay, setManualOverlay] = useState(dayjs().format("HH:mm"));

  const [previewFotoModalOpen, setPreviewFotoModalOpen] = useState(false);
  const [selectedFotoUrls, setSelectedFotoUrls] = useState([]);
  const [selectedEntryMeta, setSelectedEntryMeta] = useState(null); 
  const [unsubscribeFoto, setUnsubscribeFoto] = useState(null)

  // ------ Data & UI ------
  const [jadwal, setJadwal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBulanKey, setCurrentBulanKey] = useState(getMonthYearKey(new Date()));

  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const monthBounds = selectedMonth ? getMonthBounds(selectedMonth) : null;

  const [selectedMonthDalam, setSelectedMonthDalam] = useState(dayjs().format("YYYY-MM"));
  const [selectedMonthLuar, setSelectedMonthLuar] = useState(dayjs().format("YYYY-MM"));
  const monthBoundsDalam = selectedMonthDalam ? getMonthBounds(selectedMonthDalam) : null;
  const monthBoundsLuar = selectedMonthLuar ? getMonthBounds(selectedMonthLuar) : null;

  const [jadwalDalam, setJadwalDalam] = useState([]);
  const [jadwalLuar, setJadwalLuar] = useState([]);
  const [loadingDalam, setLoadingDalam] = useState(true);
  const [loadingLuar, setLoadingLuar] = useState(true);

  // ------------- modal delete ----------------------
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deletingFotoId, setDeletingFotoId] = useState(null);

  
 
  /* ===================== Effects ===================== */
  useEffect(() => setDateDalam(""), [selectedMonthDalam]);
  useEffect(() => setDateLuar(""), [selectedMonthLuar]);

// 🔹 GLOBAL
useEffect(() => {
  const auth = getAuth();
  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    if (!user) return navigate("/");

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const nip = userData?.nip;
      if (!nip) {
        console.warn("❌ User belum punya NIP, isi dulu di profile Firestore");
        return;
      }

      setLoading(true);
      const key = getMonthYearKeyFromMonthString(selectedMonth);
      setCurrentBulanKey(key);

      const q = query(
        collection(db, "jadwal", key, "entries"),
        where("nipKegiatan", "array-contains", nip)
      );

      // ✅ pakai onSnapshot biar realtime
      const unsubSnap = onSnapshot(q, async (snap) => {
        const raw = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const withNama = await resolvePelaksana(raw);
        setJadwal(withNama);
        setLoading(false);
      });

      return () => unsubSnap();
    } catch (err) {
      console.error("❌ Gagal ambil data:", err);
      setLoading(false);
    }
  });
  return () => unsubscribeAuth();
}, [navigate, selectedMonth]);

// 🔹 Dalam
useEffect(() => {
  const auth = getAuth();
  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    if (!user) return navigate("/");

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const nip = userData?.nip;
      if (!nip) {
        console.warn("❌ User belum punya NIP, isi dulu di profile Firestore");
        return;
      }

      setLoadingDalam(true);
      const key = getMonthYearKeyFromMonthString(selectedMonthDalam);
      const q = query(
        collection(db, "jadwal", key, "entries"),
        where("nipKegiatan", "array-contains", nip),
        where("jenisKegiatan", "==", "Dalam Ruangan")
      );

      const unsubSnap = onSnapshot(q, async (snap) => {
        const raw = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const withNama = await resolvePelaksana(raw);
        setJadwalDalam(withNama);
        setLoadingDalam(false);
      });

      return () => unsubSnap();
    } catch (err) {
      console.error("❌ Error dalam:", err);
      setLoadingDalam(false);
    }
  });
  return () => unsubscribeAuth();
}, [navigate, selectedMonthDalam]);

// 🔹 Luar
useEffect(() => {
  const auth = getAuth();
  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    if (!user) return navigate("/");

    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      const nip = userData?.nip;
      if (!nip) {
        console.warn("❌ User belum punya NIP, isi dulu di profile Firestore");
        return;
      }

      setLoadingLuar(true);
      const key = getMonthYearKeyFromMonthString(selectedMonthLuar);
      const q = query(
        collection(db, "jadwal", key, "entries"),
        where("nipKegiatan", "array-contains", nip),
        where("jenisKegiatan", "==", "luar ruangan")
      );

      const unsubSnap = onSnapshot(q, async (snap) => {
        const raw = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        const withNama = await resolvePelaksana(raw);
        setJadwalLuar(withNama);
        setLoadingLuar(false);
      });

      return () => unsubSnap();
    } catch (err) {
      console.error("❌ Error luar:", err);
      setLoadingLuar(false);
    }
  });
  return () => unsubscribeAuth();
}, [navigate, selectedMonthLuar]);


 // 🔹 update preview realtime saat ganti warna overlay
 useEffect(() => {
   if (uploadStep === 2 && fileToUpload && fileToUpload.originalFile) {
     (async () => {
       const textLines = [
         fileToUpload.tanggal || new Date().toLocaleDateString("id-ID"),
         fileToUpload.kegiatan || "-",
         fileToUpload.lokasi || "",
         manualOverlay || dayjs().format("HH:mm"),
       ];
       const { previewUrl } = await drawOverlay(fileToUpload.originalFile, textLines, overlayColor);
       setPreviewUrl(previewUrl);
     })();
   }
 }, [overlayColor, manualOverlay, fileToUpload, uploadStep]);


const location = useLocation();
 useEffect(() => {
   if (location.state?.kegiatanId) {
     const el = document.getElementById(location.state.kegiatanId);
     if (el) {
       el.scrollIntoView({ behavior: "smooth", block: "center" });
       el.classList.add("bg-yellow-100");
       setTimeout(() => el.classList.remove("bg-yellow-100"), 2000);
     }
   }
 }, [location.state, jadwalDalam, jadwalLuar]);


  /* ===================== Utils ===================== */

// fungsi helper
const getFolderName = (timestamp) => {
  if (!timestamp) return "kegiatan/umum";
  const date = timestamp.toDate(); // Firestore Timestamp -> JS Date
  return `kegiatan/${format(date, "MMMM-yyyy", { locale: id })}`; 
};

  const toYMD = (tsOrDate) => {
    if (!tsOrDate) return "";
    const d = tsOrDate?.toDate ? tsOrDate.toDate() : new Date(tsOrDate);
    return dayjs(d).format("YYYY-MM-DD");
  };

  const getLocation = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve("Lokasi tidak tersedia");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          if (accuracy > 100) {
            resolve(`Lat: ${latitude}, Lng: ${longitude} (akurasi rendah)`);
            return;
          }
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await response.json();
            resolve(data.display_name || `Lat: ${latitude}, Lng: ${longitude}`);
          } catch {
            resolve(`Lat: ${latitude}, Lng: ${longitude}`);
          }
        },
        (err) => {
          console.error("❌ Gagal dapat lokasi:", err);
          resolve("Lokasi tidak tersedia");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  /* ===================== Handlers (UPLOAD) ===================== */
  const handlePreviewFoto = (fotoArray, entryMeta) => {
  setSelectedFotoUrls(fotoArray || []);
  setSelectedEntryMeta(entryMeta || null);
  setPreviewFotoModalOpen(true);
    
  if (unsubscribeFoto) unsubscribeFoto();
   // pasang listener realtime ke dokumen entry
  const entryRef = doc(db, "jadwal", entryMeta.bulanKey, "entries", entryMeta.id);
  const unsub = onSnapshot(entryRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      setSelectedFotoUrls(data.foto || []);
    } else {
      setSelectedFotoUrls([]);
    }
  });
  setUnsubscribeFoto(() => unsub);
};

useEffect(() => {
  if (!previewFotoModalOpen && unsubscribeFoto) {
    unsubscribeFoto();
    setUnsubscribeFoto(null);
  }
}, [previewFotoModalOpen]);
  
  const handleUploadClick = (item) => {
    if ((item.foto?.length || 0) >= 3) {
      alert("❌ Maksimal 3 foto per kegiatan");
      return;
    }
    setSelectedItem(item);
    setManualOverlay(dayjs().format("HH:mm"));
    setPreviewUrl(null);
    setFileToUpload(null);
    setUploadStep(1);
    setUploadModalOpen(true);
  };

  const handleSelectFileFromModal = async (file) => {
    if (!file || !selectedItem) return;

    if ((selectedItem.foto?.length || 0) >= 3) {
      alert("❌ Maksimal 3 foto per kegiatan");
      return;
    }

    setIsProcessing(true);
    try {
      const tanggal = new Date().toLocaleDateString("id-ID");
      const kegiatan = selectedItem.namaKegiatan || "-";
      const lokasi = await getLocation();

      const textLines = [tanggal, kegiatan, lokasi, manualOverlay];
      const { blob, previewUrl } = await drawOverlay(file, textLines, overlayColor);

      setFileToUpload({
        originalFile: file,
        id: selectedItem.id,
        lokasi,
        tanggal,
        kegiatan,
      });
      setPreviewUrl(previewUrl);
      setUploadStep(2);
    } catch (e) {
      console.error(e);
      alert("Gagal memproses gambar");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinalUpload = async () => {
  if (!fileToUpload) return;
  setIsUploading(true);

  try {
    const compressed = await imageCompression(fileToUpload.originalFile, {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
    });

    const textLines = [
      fileToUpload.tanggal || new Date().toLocaleDateString("id-ID"),
      fileToUpload.kegiatan || "-",
      fileToUpload.lokasi || "",
      manualOverlay || dayjs().format("HH:mm"),
    ];

    const { blob } = await drawOverlay(compressed, textLines, overlayColor);

    // 🔹 upload ke Cloudinary dengan folder bulan-tahun
    const bulanKeyForSelected = getMonthYearKeyFromMonthString(selectedMonthLuar);
    const { url: uploadedUrl, public_id } = await uploadToCloudinary(blob, {
      folder: `kegiatan/${bulanKeyForSelected}`,
    });

    if (!uploadedUrl) {
      alert("❌ Upload gagal");
      return;
    }

    const entryRef = doc(db, "jadwal", bulanKeyForSelected, "entries", fileToUpload.id);

    // ✅ transaction untuk safety
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(entryRef);
      if (!snap.exists()) throw "Entry tidak ada";
      const data = snap.data();

      if ((data.foto?.length || 0) >= 3) {
        throw "Foto sudah penuh (max 3)";
      }

      // simpan sebagai objek {url, public_id}
      const updatedFoto = [...(data.foto || []), { url: uploadedUrl, public_id }];
      transaction.update(entryRef, { foto: updatedFoto });
    });

    alert("✅ Upload berhasil!");
    setUploadModalOpen(false);
    setUploadStep(1);
    setPreviewUrl(null);
    setFileToUpload(null);
    setSelectedItem(null);
  } catch (err) {
    console.error("❌ Upload error:", err);
    alert(err === "Foto sudah penuh (max 3)" ? err : "Upload gagal");
  } finally {
    setIsUploading(false);
  }
};

const handleUpload = async (file, kegiatan) => {
  try {
    const folderName = getFolderName(kegiatan.TANGGAL);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "your_unsigned_preset");
    formData.append("folder", folderName);

    const res = await fetch("https://api.cloudinary.com/v1_1/<cloud_name>/image/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    console.log("✅ Upload berhasil:", data.secure_url);

    // Simpan URL & public_id ke Firestore
    await updateDoc(docRef, {
      bukti: arrayUnion({
        url: data.secure_url,
        public_id: data.public_id,
      }),
    });

  } catch (err) {
    console.error("❌ Upload gagal:", err);
  }
};

  const filteredDalam = jadwalDalam.filter((item) => {
  const q = searchDalam.trim().toLowerCase();
  const matchesSearch = !q || [item.namaKegiatan, (item.pelaksana || []).join(", "), item.lokasi]
    .some((v) => (v || "").toLowerCase().includes(q));
  const matchesDate = !dateDalam || toYMD(item.tanggal) === dateDalam;
  return matchesSearch && matchesDate;
});

const filteredLuar = jadwalLuar.filter((item) => {
  const q = searchLuar.trim().toLowerCase();
  const matchesSearch = !q || [item.namaKegiatan, (item.pelaksana || []).join(", "), item.lokasi]
    .some((v) => (v || "").toLowerCase().includes(q));
  const matchesDate = !dateLuar || toYMD(item.tanggal) === dateLuar;
  return matchesSearch && matchesDate;
});


  const columnsDalam = [
    { name: "No", selector: (row, index) => index + 1, width: "60px" },
    {
      name: "Tanggal",
      selector: (row) =>
        row.tanggal?.toDate?.().toLocaleDateString("id-ID") || "-",
      sortable: true,
    },
    {
      name: "Nama Kegiatan",
      selector: (row) => (
        <span id={row.id}>
          {row.namaKegiatan}
        </span>
      ),
      wrap: true,
      sortable: true,
  },

    { name: "Pelaksana", selector: (row) => row.pelaksana?.join(", ") || "-", wrap: true },
  ];

  const columnsLuar = [
    { name: "No", selector: (row, index) => index + 1, width: "60px" },
    {
      name: "Tanggal",
      selector: (row) =>
        row.tanggal?.toDate?.().toLocaleDateString("id-ID") || "-",
      sortable: true,
    },
    {
      name: "Nama Kegiatan",
      cell: (row) => (
        <span
          id={row.id}
          className="text-blue-600 cursor-pointer hover:underline"
          onClick={() => handleUploadClick(row)}
        >
          {row.namaKegiatan}
        </span>
      ),
      wrap: true,
      sortable: true,
    },
    { name: "Pelaksana", selector: (row) => row.pelaksana?.join(", ") || "-", wrap: true },
    {
      name: "Lihat Foto",
      cell: (row) =>
        row.foto?.length > 0 ? (
          <button
            onClick={() =>
              handlePreviewFoto(
                row.foto,
                {
                  id: row.id,
                  bulanKey: getMonthYearKeyFromMonthString(selectedMonthLuar),
                }
              )
            }
            className="text-green-600 underline"
          >
            Preview Foto
          </button>
        ) : (
          "-"
        ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
    }
  ];

/* ===================== Hapus Foto ===================== */
// fungsi hapus foto
const handleDeleteImage = async (foto, entryId, bulanKey) => {
  try {
    // 🔹 Hapus dari Cloudinary
    const res = await axios.post("http://localhost:5000/delete-image", {
      publicId: foto.public_id,
    });
    console.log("✅ Berhasil hapus di Cloudinary:", res.data);

    // 🔹 Hapus juga dari Firestore
    const entryRef = doc(db, "jadwal", bulanKey, "entries", entryId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(entryRef);
      if (!snap.exists()) throw "Entry tidak ditemukan";

      const data = snap.data();
      const updatedFoto = (data.foto || []).filter(
        (f) => f.public_id !== foto.public_id
      );

      transaction.update(entryRef, { foto: updatedFoto });
    });

    console.log("✅ Foto juga dihapus dari Firestore");

    // 🔹 Hapus langsung dari state modal (biar gak nunggu onSnapshot)
    setSelectedFotoUrls((prev) =>
      prev.filter((f) => f.public_id !== foto.public_id)
    );

  } catch (err) {
    console.error("❌ Gagal hapus foto:", err);
  }
};

  /* ===================== UI ===================== */
  return (
    <div className="flex min-h-screen bg-gray-100">
      {isProcessing && <LoadingOverlay message="Memproses gambar..." />}
      {isUploading && <LoadingOverlay message="Mengunggah ke server..." />}

      {/* Sidebar */}
      <div className="sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 p-4 sm:p-10 overflow-x-hidden">
        <h1 className="text-3xl sm:text-4xl font-bold mb-4">
          Upload Bukti Kegiatan
        </h1>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            {/* ===== Dalam Ruangan ===== */}
            <div className="bg-[#4F7151] p-2 sm:p-3 rounded-2xl shadow mb-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <h1 className="text-xl font-semibold text-center text-white">
                Kegiatan Dalam Ruangan
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mb-3 w-full">
              <div className="relative w-full sm:w-1/2">
                <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchDalam}
                  onChange={(e) => setSearchDalam(e.target.value)}
                  placeholder="Cari nama kegiatan / pelaksana / lokasi…"
                  className="w-full border rounded pl-8 pr-2 py-1"
                />
              </div>
              {/* ===== Step 1 — Pilih Bulan ===== */}
              <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={selectedMonthDalam}
                    onChange={(e) => setSelectedMonthDalam(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                  <button
                    onClick={() => setSelectedMonthDalam(dayjs().format("YYYY-MM"))}
                    className="text-sm underline text-gray-600"
                  >
                    Bulan ini
                  </button>

              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={dateDalam}
                  onChange={(e) => setDateDalam(e.target.value)}
                  min={monthBoundsDalam?.min}
                  max={monthBoundsDalam?.max}
                  disabled={!selectedMonthDalam}
                  className="w-full sm:w-auto border rounded px-2 py-1 disabled:opacity-60"
                />
                {dateDalam && (
                  <button
                    onClick={() => setDateDalam("")}
                    className="text-sm underline text-gray-600 whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <DataTable
                columns={columnsDalam}
                data={filteredDalam}
                pagination
                highlightOnHover
                striped
                responsive
                noDataComponent="Kegiatan tidak tersedia"
              />
            </div>

            {/* ===== Luar Ruangan ===== */}
            <div className="bg-[#4F7151] p-2 sm:p-3 rounded-2xl shadow mb-4 mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <h1 className="text-xl font-semibold text-center text-white">
                Kegiatan Luar Ruangan
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mb-3 w-full">
              <div className="relative w-full sm:w-1/2">
                <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchLuar}
                  onChange={(e) => setSearchLuar(e.target.value)}
                  placeholder="Cari nama kegiatan / pelaksana / lokasi…"
                  className="w-full border rounded pl-8 pr-2 py-1"
                />
              </div>


              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                    type="month"
                    value={selectedMonthLuar}
                    onChange={(e) => setSelectedMonthLuar(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                  <button
                    onClick={() => setSelectedMonthLuar(dayjs().format("YYYY-MM"))}
                    className="text-sm underline text-gray-600"
                  >
                    Bulan ini
                  </button>
                <input
                  type="date"
                  value={dateLuar}
                  onChange={(e) => setDateLuar(e.target.value)}
                  min={monthBoundsLuar?.min}
                  max={monthBoundsLuar?.max}
                  disabled={!selectedMonthLuar}
                  className="w-full sm:w-auto border rounded px-2 py-1 disabled:opacity-60"
                />
                {dateLuar && (
                  <button
                    onClick={() => setDateLuar("")}
                    className="text-sm underline text-gray-600 whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <DataTable
                columns={columnsLuar}
                data={filteredLuar}
                pagination
                highlightOnHover
                striped
                responsive
                noDataComponent="Kegiatan tidak tersedia"
              />
            </div>
          </>
        )}
      </div>

      {/* ===== Modal Upload (2 Step) ===== */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-9">
          <div className="bg-white rounded-lg p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setUploadModalOpen(false)}
              className="absolute top-5 right-5 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>

            {uploadStep === 1 && (
              <>
                <h2 className="text-lg font-semibold mb-4">Unggah Bukti Kegiatan</h2>
                <label className="block border-2 border-dashed border-green-500 rounded-lg p-9 text-center cursor-pointer hover:bg-green-50">
                  <input
                    id="fileInput"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleSelectFileFromModal(e.target.files?.[0])}
                  />
                  <input
                    id="cameraInput"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleSelectFileFromModal(e.target.files?.[0])}
                  />
                  <div className="flex flex-col items-center">
                    <img src="/Upload icon.png" alt="Upload Icon" className="w-20 h-20 object-contain" />
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2">
                    <label htmlFor="fileInput" className="text-green-600 cursor-pointer hover:underline">
                      Pilih File
                    </label>
                    <span className="text-black">atau</span>
                    <label htmlFor="cameraInput" className="text-green-600 cursor-pointer hover:underline">
                      Ambil Gambar
                    </label>
                  </div>
                  <p className="text-sm text-gray-500">Format yang didukung: JPEG, PNG</p>
                </label>
              </>
            )}

            {uploadStep === 2 && previewUrl && fileToUpload && (
              <>
                <h2 className="font-semibold mb-2">Preview Gambar dengan Overlay</h2>
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="mx-auto border rounded max-w-[400px] max-h-[400px]"
                />
                {/* pilih warna overlay */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">
                    Pilih Warna Tulisan Overlay
                  </label>
                  <input
                    type="color"
                    value={overlayColor}
                    onChange={(e) => setOverlayColor(e.target.value)}
                    className="w-16 h-10 border rounded cursor-pointer"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Edit Tanggal</label>
                  <input
                    type="date"
                    defaultValue={dayjs().format("YYYY-MM-DD")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFileToUpload((prev) =>
                        ({ ...prev, tanggal: new Date(val).toLocaleDateString("id-ID") })
                      );
                    }}
                    className="px-3 py-2 border rounded-lg w-full"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium mb-1">Edit Jam (mis. 08:30)</label>
                  <input
                    type="time"
                    value={manualOverlay}
                    onChange={(e) => setManualOverlay(e.target.value)}
                    className="px-3 py-2 border rounded-lg w-full"
                  />
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setUploadModalOpen(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleFinalUpload}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Unggah
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* ===== Modal Preview Foto Koleksi ===== */}
      {previewFotoModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-2xl w-full relative">
            <button
              onClick={() => setPreviewFotoModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4">Preview Foto</h2>

            {(!selectedFotoUrls || selectedFotoUrls.length === 0) ? (
              <p className="text-center text-gray-500">Tidak ada foto</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
                {(selectedFotoUrls || []).map((fotoObj, idx) => {
                  // data lama bisa string URL, data baru objek {url, public_id}
                  const url = typeof fotoObj === "string" ? fotoObj : fotoObj.url;
                  return (
                    <div key={idx} className="relative border rounded p-2">
                      <img
                        src={url}
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-auto rounded"
                      />
                      {overlayColor && (
                        <div
                          className={`absolute inset-0 ${overlayColor} opacity-40 rounded-lg`}
                        />
                      )}
                      <button
                        onClick={() =>
                          setConfirmDelete({
                            foto: fotoObj,
                            entryId: selectedEntryMeta?.id,
                            bulanKey: selectedEntryMeta?.bulanKey,
                          })
                        }
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full"
                      >
                        <Trash2 size={18} className="text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Hapus */}
{confirmDelete && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg p-6 w-[95%] max-w-md relative">
      <h2 className="text-lg font-semibold mb-4">Konfirmasi Hapus</h2>
      <p className="mb-6">
        Apakah Anda yakin ingin menghapus foto ini? Tindakan ini tidak bisa
        dibatalkan.
      </p>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => setConfirmDelete(null)}
          className="px-4 py-2 border rounded hover:bg-gray-100"
          disabled={deletingFotoId !== null}
        >
          Batal
        </button>
        <button
          onClick={async () => {
            const { foto, entryId, bulanKey } = confirmDelete;
            setDeletingFotoId(foto.public_id);
            try {
              await handleDeleteImage(foto, entryId, bulanKey);

              // ✅ kalau semua foto sudah dihapus
              setSelectedFotoUrls((prev) => {
                const updated = prev.filter((f) => f.public_id !== foto.public_id);
                if (updated.length === 0) {
                  return []; // langsung bikin muncul "Tidak ada foto"
                }
                return updated;
              });

              setConfirmDelete(null);
            } catch (err) {
              console.error("❌ Gagal hapus foto:", err);
            } finally {
              setDeletingFotoId(null);
            }
          }}
          disabled={deletingFotoId !== null}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
        >
          {deletingFotoId !== null ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          ) : (
            "Hapus"
          )}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

/* ===================== Overlay Renderer ===================== */
async function drawOverlay(file, textLines, color = "#ffffff") {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0);

  const fontSize = Math.max(20, Math.min(canvas.width, canvas.height) * 0.035);
  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = color;
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "black";
  ctx.shadowBlur = 4;

  textLines.forEach((line, i) => {
    ctx.fillText(line, 20, canvas.height - 20 - i * (fontSize + 8));
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const previewUrl = URL.createObjectURL(blob);
      resolve({ blob, previewUrl });
    }, "image/jpeg", 0.9);
  });
}
