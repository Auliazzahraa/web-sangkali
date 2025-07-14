import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Landingpage from "./pages/landingpage";
import Login from "./pages/login";
import SignUp from "./pages/signup";
import Home from "./pages/home";
import ForgotPassword from "./pages/forgotPassword";
import EditProfile from "./pages/editprofile";
import Dashboard from "./pages/admin/dashboard";
import Jadwal from "./pages/admin/jadwal";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landingpage />} />
        <Route path="/login" element={<Login/>} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/home" element={<Home />} />
        <Route path="/forgot-password" element={<ForgotPassword/>} />
        <Route path="/edit-profile" element={<EditProfile/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
        <Route path="/jadwal" element={<Jadwal/>} />
      </Routes>
    </Router>
  );
}

export default App;
