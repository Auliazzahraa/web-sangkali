import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function LihatBuktiKeg() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "jadwal", "juli-2025", "entries"));
        const rawData = snapshot.docs.map((doc, idx) => ({
          id: doc.id,
          no: idx + 1,
          ...doc.data(),
        }));
        setData(rawData);
      } catch (err) {
        console.error("❌ Gagal mengambil data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🔁 Fungsi format tanggal
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Lihat Bukti Kegiatan</h1>

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
                <th className="border px-2 py-1">Lokasi</th>
                <th className="border px-2 py-1">Pelaksana</th>
                <th className="border px-2 py-1">Bukti Gambar</th>
                <th className="border px-2 py-1">Surat Lampiran</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="border px-2 py-1">{item.no}</td>
                  <td className="border px-2 py-1">{formatTanggal(item.TANGGAL)}</td>
                  <td className="border px-2 py-1">{item["NAMA KEGIATAN"] || "-"}</td>
                  <td className="border px-2 py-1">{item.LOKASI || "-"}</td>
                  <td className="border px-2 py-1">{item.PELAKSANA || "-"}</td>
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
                      "-"
                    )}
                  </td>
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
                        {/* Tombol Download */}
                        <a
                          href={item.suratLampiran}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="text-blue-600 underline text-sm"
                        >
                          Download PDF
                        </a>
                      </div>
                    ) : (
                      "-"
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
