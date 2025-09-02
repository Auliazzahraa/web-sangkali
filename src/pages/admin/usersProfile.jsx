import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot, // ✅ pakai realtime listener
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
  collectionGroup,
  arrayRemove,
  getDocs,
} from "firebase/firestore";

import { db } from "../../services/firebase";
import SidebarAdmin from "../../assets/components/sidebarAdmin";
import DataTable from "react-data-table-component";
import dayjs from "dayjs";
import "dayjs/locale/id";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

dayjs.locale("id");

export default function UsersProfile() {
  const [users, setUsers] = useState([]);
  const [usersPending, setUsersPending] = useState([]);
  const [loading, setLoading] = useState(true);

  // state untuk search & filter
  const [searchUsers, setSearchUsers] = useState("");
  const [filterJabatanUsers, setFilterJabatanUsers] = useState("");
  const [searchPending, setSearchPending] = useState("");
  const [filterJabatanPending, setFilterJabatanPending] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);


  // useEffect(() => {
  //   fetchUsers();
  // }, []);

  // const fetchUsers = async () => {
  //   setLoading(true);
  //   try {
  //     // fetch users aktif
  //     const snapUsers = await getDocs(collection(db, "users"));
  //     const rowsUsers = snapUsers.docs.map((d) => ({
  //       id: d.id,
  //       ...d.data(),
  //     }));

  //     // fetch users pending
  //     const snapPending = await getDocs(collection(db, "users_pending"));
  //     const rowsPending = snapPending.docs.map((d) => ({
  //       id: d.id,
  //       ...d.data(),
  //     }));

  //     setUsers(rowsUsers);
  //     setUsersPending(rowsPending);
  //   } catch (e) {
  //     console.error("❌ Error fetching users:", e);
  //     toast.error("Gagal memuat data users");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // filter function
 const filterFn = (arr, q, jabatan) => {
  return arr.filter((u) => {
    const matchSearch =
      !q ||
      [u.nama, u.nip, u.jabatan, u.email, u.gender]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase());

    const matchJabatan =
      !jabatan || (u.jabatan && u.jabatan.toLowerCase() === jabatan.toLowerCase());

    return matchSearch && matchJabatan;
  });
};

  const filteredUsers = filterFn(users, searchUsers, filterJabatanUsers);
  const filteredUsersPending = filterFn(usersPending, searchPending, filterJabatanPending);


  useEffect(() => {
  // ✅ Listener realtime untuk users
  const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setUsers(rows);
  });

  // ✅ Listener realtime untuk users_pending
  const unsubPending = onSnapshot(collection(db, "users_pending"), (snap) => {
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    setUsersPending(rows);
  });

  return () => {
    unsubUsers();
    unsubPending();
  };
}, []);


  // kolom datatable
  const columns = [
    { name: "No.", cell: (_row, index) => index + 1, width: "70px" },
    { name: "Nama", selector: (row) => row.nama || "-", sortable: true },
    { name: "NIP", selector: (row) => row.nip || "-" },
    { name: "Role", selector: (row) => row.role || "-" },
    { name: "Jabatan", selector: (row) => row.jabatan || "-" },
    { name: "Email", selector: (row) => row.email || "-" },
    { name: "Gender", selector: (row) => row.gender || "-" },
    {
      name: "Created At",
      selector: (row) =>
        row.createdAt
          ? dayjs(row.createdAt.toDate ? row.createdAt.toDate() : row.createdAt).format(
              "DD/MM/YYYY HH:mm"
            )
          : "-",
    },
  ];

  // save user
  const handleSave = async () => {
  if (!editUser) return;

  // ✅ Validasi field wajib
  if (
    !editUser.nama?.trim() ||
    !editUser.nip?.trim() ||
    !editUser.jabatan?.trim() ||
    !editUser.email?.trim() ||
    !editUser.role?.trim()
  ) {
    toast.error("❌ Nama, NIP, Jabatan, Email, dan Role wajib diisi");
    return;
  }

  setSaving(true);
  try {
    if (editUser.id && editUser._from === "users") {
      // update user aktif
      await updateDoc(doc(db, "users", editUser.id), {
        ...editUser,
        displayName: editUser.nama,
      });
      toast.success("✅ Profil user berhasil diperbarui");

    } else if (editUser.id && editUser._from === "users_pending") {
      // update user pending
      await updateDoc(doc(db, "users_pending", editUser.id), {
        ...editUser,
        displayName: editUser.nama,
      });
      toast.success("✅ User pending berhasil diperbarui");

    } else {
      // ⚠️ Validasi NIP duplikat
      const nip = editUser.nip.trim();

      const existingActive = users.find((u) => u.nip === nip);
      const existingPending = usersPending.find((u) => u.nip === nip);

      if (existingActive || existingPending) {
        toast.error("❌ NIP sudah terdaftar, gunakan NIP lain");
        setSaving(false);
        return;
      }

      // add new pending user → doc id = NIP
      await setDoc(doc(db, "users_pending", nip), {
        ...editUser,
        displayName: editUser.nama,
        createdAt: serverTimestamp(),
      });
      toast.success("✅ User baru ditambahkan");
    }

    setModalOpen(false);
  } catch (e) {
    console.error("❌ Gagal simpan:", e);
    toast.error("Gagal menyimpan user");
  } finally {
    setSaving(false);
  }
};


  // hapus user dari users
  // hapus user dari users (Firestore + Authentication via backend)
const handleDeleteUser = async (id) => {
  if (!window.confirm("Yakin ingin menghapus user ini?")) return;
  setDeleting(true);

  try {
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) throw new Error("User tidak ditemukan");

    // 🔹 Panggil backend untuk hapus user dari Authentication + Firestore
    const res = await fetch(`http://localhost:5000/delete-user/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Gagal hapus user di backend");
    }

    // 🔹 Lanjut hapus referensi di subcollection entries (opsional, sesuai logic lama)
    const oldNama = userToDelete.nama;
    const oldNip = userToDelete.nip;

    const snap = await getDocs(collectionGroup(db, "entries"));
    const batch = writeBatch(db);

    snap.forEach((docSnap) => {
      let updates = {};
      if (oldNama) updates.pelaksana = arrayRemove(oldNama);
      if (oldNip) updates.nipKegiatan = arrayRemove(oldNip);
      if (Object.keys(updates).length > 0) {
        batch.update(docSnap.ref, updates);
      }
    });

    await batch.commit();

    // update state lokal
    setUsers((prev) => prev.filter((u) => u.id !== id));
    toast.success("🗑️ User berhasil dihapus dari Authentication & Firestore");
  } catch (e) {
    console.error("❌ Gagal hapus:", e);
    toast.error(e.message || "Gagal menghapus user");
  } finally {
    setDeleting(false);
  }
};


  // hapus user dari users_pending
  const handleDeletePending = async (id) => {
    if (!window.confirm("Hapus user pending ini?")) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "users_pending", id));
      setUsersPending((prev) => prev.filter((u) => u.id !== id));
      toast.success("🗑️ User pending berhasil dihapus");
    } catch (e) {
      console.error("❌ Gagal hapus pending:", e);
      toast.error("Gagal menghapus user pending");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* Sidebar */}
      <div className="sticky top-0 h-screen">
        <SidebarAdmin />
      </div>

      {/* Konten */}
      <div className="flex-1 p-4 sm:p-10 overflow-x-hidden">
        <h1 className="text-xl md:text-2xl font-bold mb-4">Users Management</h1>

        {/* Users */}
        <h2 className="text-lg font-semibold mb-2">Users</h2>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Cari nama / email / jabatan…"
            className="border px-3 py-2 rounded-xl w-full sm:w-80"
            value={searchUsers}
            onChange={(e) => setSearchUsers(e.target.value)}
          />
          <select
            className="border px-3 py-2 rounded-xl w-full sm:w-auto"
            value={filterJabatanUsers}
            onChange={(e) => setFilterJabatanUsers(e.target.value)}
          >
            <option value="">Semua Jabatan</option>
            {[...new Set(users.map((u) => u.jabatan?.toLowerCase()).filter(Boolean))].map((j) => (
              <option key={j} value={j}>
                {j.charAt(0).toUpperCase() + j.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-8 overflow-x-auto">
          <DataTable
            columns={[
              ...columns,
              {
                name: "Aksi",
                cell: (row) => (
                  <button
                    onClick={() => handleDeleteUser(row.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded"
                  >
                    Hapus
                  </button>
                ),
              },
            ]}
            data={filteredUsers.map((u) => ({ ...u, _from: "users" }))}
            pagination
            highlightOnHover
            striped
            responsive
            noDataComponent="Tidak ada user aktif"
            onRowClicked={(row) => {
              setEditUser(row);
              setModalOpen(true);
            }}
          />
        </div>





        {/* Users Pending */}
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Users Pending</h2>
          <button
            onClick={() => {
              setEditUser({});
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-xl"
          >
            + Tambah User
          </button>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Cari nama / email / jabatan…"
            className="border px-3 py-2 rounded-xl w-full sm:w-80"
            value={searchPending}
            onChange={(e) => setSearchPending(e.target.value)}
          />
          <select
            className="border px-3 py-2 rounded-xl w-full sm:w-auto"
            value={filterJabatanPending}
            onChange={(e) => setFilterJabatanPending(e.target.value)}
          >
            <option value="">Semua Jabatan</option>
            {[...new Set(usersPending.map((u) => u.jabatan?.toLowerCase()).filter(Boolean))].map((j) => (
              <option key={j} value={j}>
                {j.charAt(0).toUpperCase() + j.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            columns={[
              ...columns,
              {
                name: "Aksi",
                cell: (row) => (
                  <button
                    onClick={() => handleDeletePending(row.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded"
                  >
                    Hapus
                  </button>
                ),
              },
            ]}
            data={filteredUsersPending.map((u) => ({ ...u, _from: "users_pending" }))}
            pagination
            highlightOnHover
            striped
            responsive
            noDataComponent="Tidak ada user pending"
            onRowClicked={(row) => {
              setEditUser(row);
              setModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4">
              {editUser?.id ? "Edit User" : "Tambah User"}
            </h2>

            {/* Form input */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nama</label>
                <input
                  type="text"
                  value={editUser?.nama || ""}
                  onChange={(e) => setEditUser({ ...editUser, nama: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">NIP</label>
                <input
                  type="text"
                  value={editUser?.nip || ""}
                  onChange={(e) => setEditUser({ ...editUser, nip: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Role</label>
                <select
                  value={editUser?.role || ""}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                >
                  <option value="">Pilih Role</option>
                  <option value="pegawai">Pegawai</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Jabatan</label>
                <input
                  type="text"
                  value={editUser?.jabatan || ""}
                  onChange={(e) => setEditUser({ ...editUser, jabatan: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={editUser?.email || ""}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Gender</label>
                <select
                  value={editUser?.gender || ""}
                  onChange={(e) => setEditUser({ ...editUser, gender: e.target.value })}
                  className="w-full border px-2 py-1 rounded"
                >
                  <option value="">Pilih Gender</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded bg-green-600 text-white"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
