import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase";

export default function Jadwal() {
  const [dataGabung, setDataGabung] = useState([]);
  const [loading, setLoading] = useState(true);

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
  const fetchData = async () => {
    try {
      const snapshot = await getDocs(collection(db, "jadwal", "juli-2025", "entries"));
      const rawData = snapshot.docs.map((doc) => doc.data());

      const mapGabung = {};

      rawData.forEach((item) => {
        const key = [
          item.TANGGAL?.seconds || "",  // gunakan .seconds agar bisa digabung
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

      const hasilGabung = Object.values(mapGabung);
      setDataGabung(hasilGabung);
    } catch (err) {
      console.error("❌ Gagal mengambil data jadwal:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, []);


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Jadwal Kegiatan - Juli</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">No</th>
                <th className="border px-2 py-1">TANGGAL</th>
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
      )}
    </div>
  );
}
