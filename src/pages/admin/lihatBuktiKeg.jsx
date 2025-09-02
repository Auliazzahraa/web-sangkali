import { useEffect, useMemo, useState } from "react";
import { db } from "../../services/firebase";
import SidebarAdmin from "../../assets/components/sidebarAdmin";
import DataTable from "react-data-table-component";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { toast, ToastContainer } from "react-toastify";
import { Plus, FileDown, RotateCcw } from "lucide-react";

import {
  collectionGroup,
  setDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  runTransaction,
} from "firebase/firestore";
import { 
  handleExportSemua, 
  handleExportPerBulan, 
  handleExportPerKegiatan 
} from "../../utills/exportHandlers";  // ⬅️ import helper
import axios from "axios";

import "react-toastify/dist/ReactToastify.css";
dayjs.locale("id");

export default function LihatBuktiKeg() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntryMeta, setSelectedEntryMeta] = useState(null); 

  // 🔎 filter state
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [dateYMD, setDateYMD] = useState("");
  const [jenis, setJenis] = useState("");

  // 🖼 modal preview
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFotos, setPreviewFotos] = useState([]);

  // ✏️ modal edit
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 👥 users: nip -> nama
  const [usersMap, setUsersMap] = useState({});
  // 🔝 di atas state
  const [confirmDelete, setConfirmDelete] = useState(null); 
  // { foto, entryId, bulanKey } kalau ada yg dipilih
  const [deletingFotoId, setDeletingFotoId] = useState(null); // simpan foto.public_id yang lagi dihapus

  const getMonthKey = (date) => {
    const dj = dayjs(date);
    return dj.format("MMMM-YYYY").toLowerCase(); // contoh: "september-2025"
};


  // ambil entries
  useEffect(() => {
    setLoading(true);

    const unsub = onSnapshot(
      collectionGroup(db, "entries"),
      (snap) => {
        const rows = snap.docs.map((docSnap) => ({
          id: docSnap.ref.path,     // path unik (karena ada parent/bulan)
          docId: docSnap.id,
          parentPath: docSnap.ref.parent.path,
          ...docSnap.data(),
        }));
        setData(rows);
        setLoading(false);
      },
      (err) => {
        console.error("❌ Gagal ambil data:", err);
        setLoading(false);
      }
    );

    return () => unsub(); // cleanup listener saat unmount
  }, []);

  // subscribe users untuk mapping nip -> nama
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const m = {};
      snapshot.forEach((d) => {
        const u = d.data();
        if (u?.nip && u?.nama) m[u.nip] = u.nama;
      });
      setUsersMap(m);
    });
    return () => unsub();
  }, []);

  // invert: nama(lower) -> nip
  const nameToNip = useMemo(() => {
    const m = {};
    Object.entries(usersMap).forEach(([nip, nama]) => {
      if (nama) m[nama.toLowerCase().trim()] = nip;
    });
    return m;
  }, [usersMap]);

  // helper tanggal
  const toDayjs = (ts) => {
    if (!ts) return null;
    const d = ts.toDate ? ts.toDate() : ts;
    const dj = dayjs(d);
    return dj.isValid() ? dj : null;
  };

  // helper ambil nama pelaksana dari nipKegiatan / fallback pelaksana lama
  const getPelaksanaNames = (row) => {
    if (Array.isArray(row?.nipKegiatan) && row.nipKegiatan.length) {
      const names = row.nipKegiatan.map((nip) => usersMap[nip]).filter(Boolean);
      if (names.length) return names;
    }
    // legacy fallback
    if (Array.isArray(row?.pelaksana)) return row.pelaksana;
    if (typeof row?.pelaksana === "string" && row.pelaksana.trim()) {
      return row.pelaksana.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  // 🎯 filtering stabil
  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();

    return data.filter((row) => {
      const pelaksanaNames = getPelaksanaNames(row).join(", ");
      const needle = [
        row.namaKegiatan,
        row.lokasi,
        row.jenisKegiatan,
        pelaksanaNames,
        Array.isArray(row.nipKegiatan)
          ? row.nipKegiatan.join(", ")
          : row.nipKegiatan,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch = !q || needle.includes(q);

      const dj = toDayjs(row.tanggal);
      const matchMonth = !month || (dj && dj.format("YYYY-MM") === month);
      const matchDate = !dateYMD || (dj && dj.format("YYYY-MM-DD") === dateYMD);

      const matchJenis =
        !jenis ||
        (row.jenisKegiatan &&
          row.jenisKegiatan.toLowerCase() === jenis.toLowerCase());

      return matchSearch && matchMonth && matchDate && matchJenis;
    });
  }, [data, search, month, dateYMD, jenis, usersMap]);

  // 📋 kolom DataTable
  const columns = [
    { name: "No.", cell: (_row, index) => index + 1, width: "70px" },
    {
      name: "Tanggal",
      selector: (row) => {
        const dj = toDayjs(row.tanggal);
        return dj ? dj.format("DD/MM/YYYY") : "-";
      },
      sortable: true,
      width: "130px",
    },
    { name: "Nama Kegiatan", selector: (row) => row.namaKegiatan || "-", wrap: true },
    { name: "Lokasi", selector: (row) => row.lokasi || "-", wrap: true },
    {
      name: "Pelaksana",
      selector: (row) => {
        const names = getPelaksanaNames(row);
        return names.length ? names.join(", ") : "-";
      },
      wrap: true,
    },
    {
      name: "NIP Kegiatan",
      selector: (row) =>
        Array.isArray(row.nipKegiatan)
          ? row.nipKegiatan.join(", ")
          : row.nipKegiatan || "-",
      wrap: true,
    },
    { name: "Jenis Kegiatan", selector: (row) => row.jenisKegiatan || "-", wrap: true },
    {
      name: "Bukti Gambar",
      cell: (row) => {
        const fotos = Array.isArray(row.foto) ? row.foto : row.foto ? [row.foto] : [];
        return fotos.length ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFotoUrls(fotos);
              setSelectedEntryMeta({
                id: row.docId,
                bulanKey: row.parentPath.split("/")[1], // parentPath: jadwal/{bulan}/entries
              });
              setPreviewOpen(true);
            }}
            className="text-blue-600 underline"
          >
            Preview
          </button>
        ) : (
          "-"
        );
      },
      ignoreRowClick: true,
    },
    {
      name: "Aksi",
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleExportPerKegiatan(row);
          }}
          className="px-2 py-1 bg-green-600 text-white rounded text-sm"
        >
          Export
        </button>
      ),
      ignoreRowClick: true,
      width: "120px",
    },
  ];

  // batas min/max tanggal
  const monthMin = month
    ? dayjs(`${month}-01`).startOf("month").format("YYYY-MM-DD")
    : undefined;
  const monthMax = month
    ? dayjs(`${month}-01`).endOf("month").format("YYYY-MM-DD")
    : undefined;

  // 🚀 simpan perubahan edit
const handleSaveEdit = async () => {
  if (!editRow) return;
  setSaving(true);

  try {
    const docRef = doc(db, editRow.parentPath, editRow.docId);

    // bikin payload baru
    const updatedData = {
      namaKegiatan: editRow.namaKegiatan,
      tanggal: editRow.tanggal,
      lokasi: editRow.lokasi,
      jenisKegiatan: editRow.jenisKegiatan,
      foto: editRow.foto || [],
      nipKegiatan: editRow.nipKegiatan || [],
    };

    // update ke firestore
    await updateDoc(docRef, updatedData);

    // langsung update state lokal supaya realtime di table
    setData((prev) =>
      prev.map((row) =>
        row.id === editRow.id ? { ...row, ...updatedData } : row
      )
    );

    toast.success("✅ Data berhasil diperbarui!");
    setEditOpen(false);
  } catch (err) {
    console.error("❌ Gagal update:", err);
    toast.error("Gagal update data.");
  } finally {
    setSaving(false);
  }
};

// Tambahan: handle edit ID dinamis
const handleSaveEditDynamicId = async () => {
  if (!editRow) return;
  setSaving(true);

  try {
    const oldRef = doc(db, editRow.parentPath, editRow.docId);

    const dj = dayjs(editRow.tanggal);
    const newBulanKey = dj.format("MMMM-YYYY").toLowerCase();
    const newDocId = `${editRow.namaKegiatan}_${editRow.lokasi}_${dj.format("YYYY-MM-DD")}`;
    const newRef = doc(db, "jadwal", newBulanKey, "entries", newDocId);

    const updatedData = {
      namaKegiatan: editRow.namaKegiatan,
      tanggal: new Date(editRow.tanggal),
      lokasi: editRow.lokasi,
      jenisKegiatan: editRow.jenisKegiatan,
      foto: editRow.foto || [],
      nipKegiatan: editRow.nipKegiatan || [],
    };

    // ✅ Cek apakah bulan atau docId berubah
    const oldBulanKey = editRow.parentPath.split("/")[1];
    if (newDocId === editRow.docId && newBulanKey === oldBulanKey) {
      // Update normal
      await updateDoc(oldRef, updatedData);
    } else {
      // Pindah ke subcollection bulan baru
      await setDoc(newRef, updatedData);
      await deleteDoc(oldRef);
    }

    // Update state lokal
    setData((prev) =>
      prev.map((row) =>
        row.id === editRow.id
          ? { ...row, ...updatedData, docId: newDocId, parentPath: `jadwal/${newBulanKey}/entries`, id: `jadwal/${newBulanKey}/entries/${newDocId}` }
          : row
      )
    );

    toast.success("✅ Data berhasil diperbarui dan dipindahkan jika bulan berubah!");
    setEditOpen(false);
  } catch (err) {
    console.error("❌ Gagal update:", err);
    toast.error("Gagal update data.");
  } finally {
    setSaving(false);
  }
};

 // 🗑 hapus dokumen
const handleDelete = async () => {
  if (!editRow) return;
  if (!confirm("Yakin ingin menghapus kegiatan ini?")) return;

  setDeleting(true);
  try {
    await deleteDoc(doc(db, editRow.parentPath, editRow.docId));
    toast.success("✅ Data berhasil dihapus!");
    setEditOpen(false);
  } catch (err) {
    console.error("❌ Gagal hapus:", err);
    toast.error("Gagal hapus data.");
  } finally {
    setDeleting(false);
  }
};

// 🔝 di state atas
const [tambahOpen, setTambahOpen] = useState(false);
const [newRow, setNewRow] = useState({
  namaKegiatan: "",
  tanggal: new Date(),
  lokasi: "",
  jenisKegiatan: "",
  nipKegiatan: [],
  foto: [],
});

// 🚀 simpan tambah kegiatan
const handleSaveTambah = async () => {
  if (!newRow.namaKegiatan || !newRow.tanggal || !newRow.lokasi || !newRow.jenisKegiatan) {
    toast.error("⚠️ Mohon lengkapi semua field.");
    return;
  }

  try {
    const dj = dayjs(newRow.tanggal);
    const bulanTahun = dj.format("MMMM-YYYY").toLowerCase();
    const id = `${newRow.namaKegiatan}_${newRow.lokasi}_${dj.format("YYYY-MM-DD")}`;

    const docRef = doc(db, "jadwal", bulanTahun, "entries", id);

    const payload = {
      ...newRow,
      tanggal: new Date(newRow.tanggal),
      foto: newRow.foto || [],
      nipKegiatan: newRow.nipKegiatan || [],
    };

    await setDoc(docRef, payload);

    toast.success("✅ Kegiatan berhasil ditambahkan!");
    setTambahOpen(false);
    setNewRow({
      namaKegiatan: "",
      tanggal: new Date(),
      lokasi: "",
      jenisKegiatan: "",
      nipKegiatan: [],
      foto: [],
    });
  } catch (err) {
    console.error("❌ Gagal tambah:", err);
    toast.error("Gagal menambahkan kegiatan.");
  }
};

/* ===================== Hapus Foto ===================== */
// fungsi hapus foto
const [selectedFotoUrls, setSelectedFotoUrls] = useState([]);
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

  return (
    <div className="flex min-h-screen bg-white font-sans">
      <div className="sticky top-0 h-screen">
        <SidebarAdmin/>
      </div>

      <div className="flex-1 p-4 sm:p-10 overflow-x-hidden">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Lihat Bukti Kegiatan</h1>

        {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Left side: search & filter */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <input
                type="text"
                placeholder="Search…"
                className="border px-3 py-2 rounded-xl w-80"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {/* Filter */}
              <input
                type="month"
                className="border px-3 py-2 rounded-xl w-28"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setDateYMD("");
                }}
              />
              <input
                type="date"
                className="border px-3 py-2 rounded-xl"
                value={dateYMD}
                onChange={(e) => setDateYMD(e.target.value)}
                min={monthMin}
                max={monthMax}
                disabled={!month}
              />
              {/* <select
                className="border px-3 py-2 rounded"
                value={jenis}
                onChange={(e) => setJenis(e.target.value)}
              >
                <option value="">Semua Jenis</option>
                <option value="Dalam Ruangan">Dalam Ruangan</option>
                <option value="Luar Ruangan">Luar Ruangan</option>
              </select> */}

              {/* Reset */}
              {(search || month || dateYMD || jenis) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setMonth("");
                    setDateYMD("");
                    setJenis("");
                  }}
                  className="px-3 py-2 rounded-xl border hover:bg-gray-100 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>

            {/* Right side: export & tambah kegiatan */}
            <div className="flex overflow-x-auto gap-2 pb-1 sm:pb-0">
              {/* <button
                onClick={() => handleExportSemua(filteredData)}
                className="flex-shrink-0 text-xs sm:text-base px-4 py-2 border rounded-xl flex items-center gap-2 hover:bg-gray-100"
              > */}
                <button
                  onClick={() => {
                    console.log("▶️ Klik Export Semua, filteredData:", filteredData.length);
                    handleExportSemua(filteredData);
                    // className="flex-shrink-0 text-xs sm:text-base px-4 py-2 border rounded-xl flex items-center gap-2 hover:bg-gray-100"
                  }}
                >

                <FileDown className="sm:w-4 sm:h-4" />
                Export Semua
              </button>
              <button
                onClick={() => handleExportPerBulan(filteredData, month)}
                disabled={!month}
                className={`flex-shrink-0 text-xs sm:text-base px-4 py-2 rounded-xl flex items-center gap-2 ${
                  month
                    ? "border hover:bg-gray-100"
                    : "border bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
              >
                <FileDown className="sm:w-4 sm:h-4" />
                Export Bulan
              </button>
              <button
                onClick={() => setTambahOpen(true)}
                className="flex-shrink-0 text-xs sm:text-base px-4 py-2 bg-green-600 text-white rounded-xl flex items-center gap-2 hover:bg-green-700"
              >
                <Plus className="sm:w-4 sm:h-4" />
                Tambah Kegiatan
              </button>
            </div>
          </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <DataTable
              columns={columns}
              data={filteredData}
              pagination
              highlightOnHover
              striped
              responsive
              noDataComponent="Tidak ada data yang cocok"
              onRowClicked={(row) => {
                setEditRow(row);
                setEditOpen(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal Preview Foto */}
     {/* Modal Preview Foto */}
{previewOpen && selectedEntryMeta && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-4 max-w-3xl w-full relative">
      <button
        onClick={() => setPreviewOpen(false)}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
      >
        ✕
      </button>
      <h2 className="text-lg font-semibold mb-4">Preview Foto</h2>

      {/* 🔎 Ambil entry terbaru dari data realtime */}
      {(() => {
        const currentEntry = data.find(
          (r) =>
            r.docId === selectedEntryMeta.id &&
            r.parentPath.split("/")[1] === selectedEntryMeta.bulanKey
        );
        const fotos = Array.isArray(currentEntry?.foto)
          ? currentEntry.foto
          : currentEntry?.foto
          ? [currentEntry.foto]
          : [];

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
            {fotos.length === 0 ? (
              <p className="text-center text-gray-500">Tidak ada foto</p>
            ) : (
              fotos.map((fotoObj, idx) => {
                const url =
                  typeof fotoObj === "string" ? fotoObj : fotoObj.url;
                const isDeleting =
                  deletingFotoId === fotoObj.public_id; // loading per foto

                return (
                  <div
                    key={idx}
                    className="relative border rounded overflow-hidden"
                  >
                    {/* Tombol hapus */}
                    <button
                      onClick={() =>
                        setConfirmDelete({
                          foto: fotoObj,
                          entryId: selectedEntryMeta?.id,
                          bulanKey: selectedEntryMeta?.bulanKey,
                        })
                      }
                      disabled={deletingFotoId === fotoObj.public_id}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 p-2 rounded-full"
                    >
                      {isDeleting ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"></span>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4m-4 0v4m4-4v4M6 7h12"
                          />
                        </svg>
                      )}
                    </button>
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                );
              })
            )}
          </div>
        );
      })()}
    </div>
  </div>
)}
      {/* Modal hapus */}
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
                    toast.success("✅ Foto berhasil dihapus");
                    setConfirmDelete(null);
                  } catch {
                    toast.error("❌ Gagal hapus foto");
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
      {/* Modal Edit */}
      {editOpen && editRow && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-6 w-[95%] max-w-2xl relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setEditOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>

            <h2 className="text-lg font-semibold mb-4">Edit Kegiatan</h2>

            <div className="space-y-4">
              {/* Nama Kegiatan */}
              <div>
                <label className="block text-sm font-medium">Nama Kegiatan</label>
                <input
                  type="text"
                  value={editRow.namaKegiatan || ""}
                  onChange={(e) =>
                    setEditRow({ ...editRow, namaKegiatan: e.target.value })
                  }
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-sm font-medium">Tanggal</label>
                <input
                  type="date"
                  value={
                    editRow.tanggal
                      ? dayjs(toDayjs(editRow.tanggal)).format("YYYY-MM-DD")
                      : ""
                  }
                  onChange={(e) =>
                    setEditRow({
                      ...editRow,
                      tanggal: new Date(e.target.value),
                    })
                  }
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              {/* Lokasi */}
              <div>
                <label className="block text-sm font-medium">Lokasi</label>
                <input
                  type="text"
                  value={editRow.lokasi || ""}
                  onChange={(e) =>
                    setEditRow({ ...editRow, lokasi: e.target.value })
                  }
                  className="border rounded px-3 py-2 w-full"
                />
              </div>

              {/* Jenis Kegiatan */}
              <div>
                <label className="block text-sm font-medium">Jenis Kegiatan</label>
                <select
                  value={editRow.jenisKegiatan || ""}
                  onChange={(e) =>
                    setEditRow({ ...editRow, jenisKegiatan: e.target.value })
                  }
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Pilih Jenis</option>
                  <option value="Dalam Ruangan">Dalam Ruangan</option>
                  <option value="luar ruangan">Luar Ruangan</option>
                </select>
              </div>

              {/* Pelaksana */}
              <div>
                <label className="block text-sm font-medium">Pelaksana</label>
                <div className="space-y-2">
                  {/* Daftar pelaksana terpilih */}
                  {Array.isArray(editRow.nipKegiatan) &&
                    editRow.nipKegiatan.map((nip, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between border rounded px-3 py-2"
                      >
                        <span>{usersMap[nip] || nip}</span>
                        <button
                          onClick={() => {
                            const newList = editRow.nipKegiatan.filter(
                              (n) => n !== nip
                            );
                            setEditRow({ ...editRow, nipKegiatan: newList });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                  {/* Dropdown tambah pelaksana */}
                  <PelaksanaSelector
                    usersMap={usersMap}
                    onSelect={(nip) => {
                      if (
                        nip &&
                        !editRow.nipKegiatan.includes(nip)
                      ) {
                        setEditRow({
                          ...editRow,
                          nipKegiatan: [...(editRow.nipKegiatan || []), nip],
                        });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="mt-6 flex justify-between">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus"}
              </button>
              <button
                onClick={handleSaveEditDynamicId}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
  {/* Modal Tambah Kegiatan */}
{tambahOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2">
    <div className="bg-white rounded-lg p-6 w-[95%] max-w-2xl relative max-h-[80vh] overflow-y-auto">
      <button
        onClick={() => setTambahOpen(false)}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
      >
        ✕
      </button>

      <h2 className="text-lg font-semibold mb-4">Tambah Kegiatan</h2>

      <div className="space-y-4">
        {/* Nama Kegiatan */}
        <div>
          <label className="block text-sm font-medium">Nama Kegiatan</label>
          <input
            type="text"
            value={newRow.namaKegiatan}
            onChange={(e) => setNewRow({ ...newRow, namaKegiatan: e.target.value })}
            className="border rounded px-3 py-2 w-full"
          />
        </div>

        {/* Tanggal */}
        <div>
          <label className="block text-sm font-medium">Tanggal</label>
          <input
            type="date"
            value={dayjs(newRow.tanggal).format("YYYY-MM-DD")}
            onChange={(e) => setNewRow({ ...newRow, tanggal: new Date(e.target.value) })}
            className="border rounded px-3 py-2 w-full"
          />
        </div>

        {/* Lokasi */}
        <div>
          <label className="block text-sm font-medium">Lokasi</label>
          <input
            type="text"
            value={newRow.lokasi}
            onChange={(e) => setNewRow({ ...newRow, lokasi: e.target.value })}
            className="border rounded px-3 py-2 w-full"
          />
        </div>

        {/* Jenis Kegiatan */}
        <div>
          <label className="block text-sm font-medium">Jenis Kegiatan</label>
          <select
            value={newRow.jenisKegiatan}
            onChange={(e) => setNewRow({ ...newRow, jenisKegiatan: e.target.value })}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Pilih Jenis</option>
            <option value="Dalam Ruangan">Dalam Ruangan</option>
            <option value="luar ruangan">Luar Ruangan</option>
          </select>
        </div>

        {/* Pelaksana */}
        <div>
          <label className="block text-sm font-medium">Pelaksana</label>
          <div className="space-y-2">
            {newRow.nipKegiatan.map((nip, idx) => (
              <div key={idx} className="flex items-center justify-between border rounded px-3 py-2">
                <span>{usersMap[nip] || nip}</span>
                <button
                  onClick={() => {
                    const newList = newRow.nipKegiatan.filter((n) => n !== nip);
                    setNewRow({ ...newRow, nipKegiatan: newList });
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ))}

            <PelaksanaSelector
              usersMap={usersMap}
              onSelect={(nip) => {
                if (nip && !newRow.nipKegiatan.includes(nip)) {
                  setNewRow({ ...newRow, nipKegiatan: [...newRow.nipKegiatan, nip] });
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Tombol Aksi */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSaveTambah}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Simpan
        </button>
      </div>
    </div>
  </div>
)}


      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

function PelaksanaSelector({ usersMap, onSelect }) {
  const [search, setSearch] = useState("");

  const filteredUsers = Object.entries(usersMap).filter(([nip, nama]) =>
    nama.toLowerCase().includes(search.toLowerCase()) ||
    nip.includes(search)
  );

  return (
    <div className="border rounded p-2 space-y-2">
      <input
        type="text"
        placeholder="Cari nama / NIP..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border px-2 py-1 rounded w-full"
      />
      <div className="max-h-40 overflow-y-auto space-y-1">
        {filteredUsers.map(([nip, nama]) => (
          <button
            key={nip}
            onClick={() => onSelect(nip)}
            className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded"
          >
            {nama} ({nip})
          </button>
        ))}
        {!filteredUsers.length && (
          <p className="text-sm text-gray-500 px-2">Tidak ditemukan</p>
        )}
      </div>
    </div>
  );
}
