import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landingpage from "./pages/landingpage";
import Login from "./pages/login";
import SignUp from "./pages/signup";
import Home from "./pages/pegawai/home";
import ForgotPassword from "./pages/forgotPassword";
import EditProfile from "./pages/editprofile";
import Dashboard from "./pages/admin/dashboard";
import BuktiKegiatan from "./pages/pegawai/buktiKegiatan";
import LihatBuktiKeg from "./pages/admin/lihatBuktiKeg";
import UsersProfile from "./pages/admin/usersProfile";
import AuthCallback from "./pages/pegawai/AuthCallback";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/home" element={<Home />} />
        <Route path="/forgot-password" element={<ForgotPassword/>} />
        <Route path="/edit-profile" element={<EditProfile/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/bukti-kegiatan" element={<BuktiKegiatan/>} />
        <Route path="/admin-lihat-bukti" element={<LihatBuktiKeg/>} />
        <Route path="/admin-users" element={<UsersProfile />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </Router>
  );
}

export default App;
