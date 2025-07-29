import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../services/firebase";


export default function Jadwal() {
  const [dataGabung, setDataGabung] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const navigate = useNavigate();

  // Format tanggal ke DD/MM/YYYY
  const formatTanggal = (timestamp) => {
  try {
    if (!timestamp?.toDate) return "-";
    const date = timestamp.toDate();
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (!user) navigate("/login");
  });
  return () => unsubscribe();
}, [navigate]);


  useEffect(() => {
  let isMounted = true;

  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (!user && isMounted) navigate("/login");
  });

  const fetchData = async () => {
    try {
      const snapshot = await getDocs(collection(db, "jadwal", "juli-2025", "entries"));
      let rawData = snapshot.docs.map((doc) => doc.data());

      const mapGabung = {};

      rawData.forEach((item) => {
        const key = [
          item.TANGGAL?.seconds || "",
          item.INDUK,
          item["ANAKAN INDUK"],
          item["INCU INDUK"],
          item.PEMETAAN,
          item["NAMA KEGIATAN"],
          item.LOKASI,
          item.KELURAHAN,
          item.HARGA,
        ].join("|");

        if (!mapGabung[key]) {
          mapGabung[key] = {
            ...item,
            PELAKSANA: [item.PELAKSANA],
          };
        } else {
          mapGabung[key].PELAKSANA.push(item.PELAKSANA);
        }
      });

      let hasilGabung = Object.values(mapGabung);

      // Filter by search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        hasilGabung = hasilGabung.filter((item) =>
          (item["NAMA KEGIATAN"] || "").toLowerCase().includes(term) ||
          (item.PELAKSANA || "").toString().toLowerCase().includes(term)
        );
      }

      // Filter by date
      if (selectedDate) {
        const selected = new Date(selectedDate);
        hasilGabung = hasilGabung.filter((item) => {
          const tgl = item.TANGGAL?.toDate?.();
          return (
            tgl &&
            tgl.getFullYear() === selected.getFullYear() &&
            tgl.getMonth() === selected.getMonth() &&
            tgl.getDate() === selected.getDate()
          );
        });
      }

      // Sort
      hasilGabung.sort((a, b) => {
        const tA = a.TANGGAL?.toDate?.()?.getTime() || 0;
        const tB = b.TANGGAL?.toDate?.()?.getTime() || 0;
        return sortAsc ? tA - tB : tB - tA;
      });

      if (isMounted) {
        setDataGabung(hasilGabung);
        setLoading(false);
      }
    } catch (err) {
      console.error("❌ Gagal mengambil data jadwal:", err);
    }
  };

  fetchData();

  return () => {
    isMounted = false;
    unsubscribe();
  };
}, [searchTerm, selectedDate, sortAsc, navigate]);

  return (
    <div className="p-6">
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
      >
        ← Kembali ke Dashboard
      </button>

      <h1 className="text-2xl font-bold mb-4">Jadwal Kegiatan - Juli</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          {/* 🔍 FILTER DAN SEARCH */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Filter Tanggal</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Search</label>
              <input
                type="text"
                placeholder="Cari nama kegiatan, pelaksana..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          {loading && <p className="text-sm text-gray-500">🔄 Memuat data...</p>}
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">No</th>
                  <th
                    className="border px-2 py-1 cursor-pointer select-none"
                    onClick={() => setSortAsc(!sortAsc)}
                  >
                    TANGGAL {sortAsc ? "▲" : "▼"}
                  </th>
                  <th className="border px-2 py-1">INDUK</th>
                  <th className="border px-2 py-1">ANAKAN INDUK</th>
                  <th className="border px-2 py-1">INCU INDUK</th>
                  <th className="border px-2 py-1">PEMETAAN</th>
                  <th className="border px-2 py-1">NAMA KEGIATAN</th>
                  <th className="border px-2 py-1">PELAKSANA</th>
                  <th className="border px-2 py-1">LOKASI</th>
                  <th className="border px-2 py-1">KELURAHAN</th>
                  <th className="border px-2 py-1">HARGA</th>
                </tr>
              </thead>
              <tbody>
                {dataGabung.map((item, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="border px-2 py-1">{idx + 1}</td>
                    <td className="border px-2 py-1">{formatTanggal(item.TANGGAL)}</td>
                    <td className="border px-2 py-1">{item.INDUK || "-"}</td>
                    <td className="border px-2 py-1">{item["ANAKAN INDUK"] || "-"}</td>
                    <td className="border px-2 py-1">{item["INCU INDUK"] || "-"}</td>
                    <td className="border px-2 py-1">{item.PEMETAAN || "-"}</td>
                    <td className="border px-2 py-1">{item["NAMA KEGIATAN"] || "-"}</td>
                    <td className="border px-2 py-1">
                      {Array.isArray(item.PELAKSANA)
                        ? item.PELAKSANA.join(", ")
                        : item.PELAKSANA || "-"}
                    </td>
                    <td className="border px-2 py-1">{item.LOKASI || "-"}</td>
                    <td className="border px-2 py-1">{item.KELURAHAN || "-"}</td>
                    <td className="border px-2 py-1">{item.HARGA || "-"}</td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </>
      )}      
    </div>
  );
}
