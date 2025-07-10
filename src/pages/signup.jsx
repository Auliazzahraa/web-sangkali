import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logopkm.png";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../services/firebase"; // pastikan path benar sesuai project kamu
// note :
// - belum bikin pesan error kalo gmailnya udah dipake
// web-pkm-6c1e1.firebaseapp.com (domain sebelumnya)

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");


  // cek inputan full name -> gaboleh kosong
  const [fullName, setFullName] = useState("");
  const [fullNameError, setFullNameError] = useState("");
  const handleFullNameChange = (e) => {
    const value = e.target.value;
    setFullName(value);

    if (value.trim() === "") {
      setFullNameError("Nama tidak boleh kosong");
    } else {
      setFullNameError("");
    }
  };

  // cek inputan di email -> gaboleh gaada @gmail.com
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    // Validasi: harus mengandung @gmail dan format valid
    if (!value.includes("@gmail")) {
      setEmailError("Masukkan alamat email yang valid (contoh, user@example.com).");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Format email tidak valid");
    } else {
      setEmailError(""); // ✅ valid
    }
  };

  // buat cek password -> 6<= pw <=10 karakter
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isPasswordTouched, setIsPasswordTouched] = useState(false);

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);

    // validasi saat user mengetik
    if (value.length < 6 || value.length > 10) {
      setPasswordError("Password harus 6–10 karakter");
    } else {
      setPasswordError("");
    }
  };


  // ini buat ngatur confirm pw, dengan logic sama + harus sama dengan pw
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    if (value !== password) {
      setConfirmPasswordError("Konfirmasi password tidak sama");
    } else {
      setConfirmPasswordError("");
    }
  };
                                          

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMsg("Password dan konfirmasi tidak sama.");
      return;
    }
    if (fullName.trim() === "") {
      setFullNameError("Nama tidak boleh kosong");
      return;
    }

    if (password.length < 6 || password.length > 10) {
      setPasswordError("Password harus 6–10 karakter");
      return;
    }
    if (confirmPassword !== password) {
      setConfirmPasswordError("Konfirmasi password tidak sama");
      return;
    } 


    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(userCredential.user, {
        displayName: fullName,
      });

      navigate("/home");
    } catch (error) {
      console.error("Signup error:", error.message);
      setErrorMsg(error.message);
    }
  };

  // fungsi buat sign up with google
  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/home");
    } catch (error) {
      console.error("Google Sign-Up error:", error.message);
      alert("Gagal login dengan Google: " + error.message);
    }
  };


  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-black/40"
      style={{ backgroundImage: "url('/BG LOGIN.png')" }}
    >
      <div className="relative bg-white rounded-2xl shadow-lg p-4 pt-8 w-full max-w-[320px] sm:max-w-sm md:max-w-md">
        <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
          <img src={logo} alt="Logo" className="w-32 h-32 p-2" />
        </div>

        <br />
        <h2 className="text-2xl font-bold text-center text-gray-800">Sign Up</h2>
        <p className="text-sm text-center text-gray-500 mb-4">Selamat datang!</p>

        {errorMsg && (
          <div className="text-red-600 text-sm text-center mb-4">{errorMsg}</div>
        )}

        {/* tempat form loginnya */}
        <form onSubmit={handleSubmit}>
          {/* full name */}
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              placeholder="Masukkan Nama Lengkapmu"
              value={fullName}
              onChange={handleFullNameChange}
              className={`w-full border ${
                fullNameError ? "border-red-500" : "border-gray-300"
              } rounded-md px-3 py-2 text-sm focus:outline-none ${
                fullNameError ? "focus:ring-red-500" : "focus:ring-green-500"
              }`}
              required
            />
            {fullNameError && (
              <p className="text-sm text-red-600 mt-1">{fullNameError}</p>
            )}
          </div>
          {/* email */}
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="Masukkan Emailmu"
              value={email}
              onChange={handleEmailChange}
              className={`w-full border ${
                emailError ? "border-red-500" : "border-gray-300"
              } rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                emailError ? "focus:ring-red-500" : "focus:ring-green-500"
              }`}
              required
            />
            {emailError && (
              <p className="text-sm text-red-600 mt-1">{emailError}</p>
            )}
          </div>
          {/* password */}
          <div className="mb-4 relative">
            <label className="block mb-1 text-sm font-medium text-gray-700">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan Kata Sandi"
              value={password}
              onChange={handlePasswordChange}
              onFocus={() => setIsPasswordTouched(true)}
              className={`w-full border ${
                passwordError ? "border-red-500" : "border-gray-300"
              } rounded-md px-3 py-2 text-sm focus:outline-none ${
                passwordError ? "focus:ring-red-500" : "focus:ring-green-500"
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 text-sm"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>

            {isPasswordTouched && passwordError && (
              <p className="text-sm text-red-600 mt-1">{passwordError}</p>
            )}
          </div>


          <div className="mb-4 relative">
            <label className="block mb-1 text-sm font-medium text-gray-700">Confirm Password</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Masukkan Kata Sandi Lagi"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className={`w-full border ${
                confirmPasswordError ? "border-red-500" : "border-gray-300"
              } rounded-md px-3 py-2 text-sm focus:outline-none ${
                confirmPasswordError ? "focus:ring-red-500" : "focus:ring-green-500"
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-9 text-gray-500 text-sm"
            >
              {showConfirmPassword ? "🙈" : "👁️"}
            </button>

            {confirmPasswordError && (
              <p className="text-sm text-red-600 mt-1">{confirmPasswordError}</p>
            )}
          </div>


          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-full transition"
          >
            Sign Up
          </button>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="mt-3 w-full border border-gray-300 flex justify-center items-center py-2 rounded-full hover:bg-gray-50 transition"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5 mr-2"
            />
            Sign Up with Google
          </button>


          <p className="mt-6 text-sm text-center text-gray-600">
            Sudah punya akun?{" "}
            <span
              className="text-green-700 font-semibold hover:underline cursor-pointer"
              onClick={() => navigate("/login")}
            >
              Sign In
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}
