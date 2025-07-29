import { useEffect } from "react";

export default function GoogleDriveLogin() {
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        localStorage.setItem("googleAccessToken", token);
        alert("✅ Login Google berhasil!");
        window.location.hash = ""; // hapus token dari URL
      }
    }
  }, []);

  const loginGoogle = () => {
    const clientId = "39119738920-7lbm62091t7966p4k2bbeisc32pklo3q.apps.googleusercontent.com"; // ← ganti client ID kamu
    const redirectUri = window.location.origin; // http://localhost:5173
    const scope = "https://www.googleapis.com/auth/drive.file";

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;

    window.location.href = authUrl;
  };

  return (
    <button
      onClick={loginGoogle}
      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
    >
      🔐 Login Google Drive
    </button>
  );
}
