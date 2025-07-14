import { useState } from "react";
import * as XLSX from "xlsx";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../services/firebase";
import {Timestamp } from "firebase/firestore";

export default function ExcelUpload() {
  const [loading, setLoading] = useState(false);
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");
  const [file, setFile] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setSuccessMessage(""); // reset pesan sukses
  };

//   const convertExcelDate = (value) => {
//     if (!value) return null;
//     if (value instanceof Date) return value;

//     const serial = Number(value);
//     if (isNaN(serial)) return null;

//     const baseDate = new Date(Date.UTC(1899, 11, 30));
//     return new Date(baseDate.getTime() + serial * 86400000);
// };


  const handleUpload = async () => {
    if (!file || !bulan || !tahun) {
        alert("Mohon pilih bulan, tahun, dan file Excel terlebih dahulu.");
        return;
    }

    setLoading(true);
    setSuccessMessage("");

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        const jsonData = XLSX.utils.sheet_to_json(sheet).map((row) => {
          let tanggalFinal = null;

          if (typeof row.TANGGAL === "number") {
            const baseDate = new Date(Date.UTC(1899, 11, 30));
            const convertedDate = new Date(baseDate.getTime() + row.TANGGAL * 86400000);
            tanggalFinal = Timestamp.fromDate(convertedDate);
          } else if (row.TANGGAL instanceof Date) {
            tanggalFinal = Timestamp.fromDate(row.TANGGAL);
          } else if (typeof row.TANGGAL === "string") {
            const [day, month, year] = row.TANGGAL.split("/");
            const parsedDate = new Date(`${year}-${month}-${day}`);
            tanggalFinal = Timestamp.fromDate(parsedDate);
          }

          // Hapus field yang tidak perlu
          delete row.TANGGAL;
          delete row.tanggal;

          return {
            ...row,
            TANGGAL: tanggalFinal,
          };
        });



        const batch = jsonData.map((row) =>
            addDoc(collection(db, "jadwal", `${bulan}-${tahun}`, "entries"), row)
        );

        await Promise.all(batch);
        setSuccessMessage("✅ Upload berhasil ke Firestore!");
        setFile(null);
        } catch (err) {
        console.error("🔥 Upload error:", err);
        alert("Terjadi kesalahan saat upload: " + err.message);
        } finally {
        setLoading(false);
        }
    };

    reader.readAsBinaryString(file);
    };



  return (
    <div className="text-center space-y-4">
      {/* Dropdown Bulan */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
        {/* Dropdown Bulan */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Bulan</label>
            <select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
            <option value="">-- Pilih Bulan --</option>
            <option value="januari">Januari</option>
            <option value="februari">Februari</option>
            <option value="maret">Maret</option>
            <option value="april">April</option>
            <option value="mei">Mei</option>
            <option value="juni">Juni</option>
            <option value="juli">Juli</option>
            <option value="agustus">Agustus</option>
            <option value="september">September</option>
            <option value="oktober">Oktober</option>
            <option value="november">November</option>
            <option value="desember">Desember</option>
            </select>
        </div>

        {/* Dropdown Tahun */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Tahun</label>
                <select
                value={tahun}
                onChange={(e) => setTahun(e.target.value)}
                className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                <option value="">-- Pilih Tahun --</option>
                {Array.from({ length: 81 }, (_, i) => 2020 + i).map((year) => (
                    <option key={year} value={year}>{year}</option>
                ))}
                </select>
            </div>
        </div>


      {/* Input File */}
      <div>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="border rounded px-3 py-2"
        />
      </div>

      {/* Tombol Upload */}
      <button
        onClick={handleUpload}
        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded disabled:opacity-50"
        disabled={!file || loading}
      >
        {loading ? "Mengupload..." : "Upload Sekarang"}
      </button>

      {/* Notifikasi Sukses */}
      {successMessage && (
        <p className="text-green-600 font-medium mt-4">{successMessage}</p>
      )}
    </div>
  );
}
