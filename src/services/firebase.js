// Firebase v9+ modular
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDQJqHqomC-qXRcAzhpJnQBcxv-6KsBd_M",
  authDomain: "web-pkm-6c1e1.firebaseapp.com",
  projectId: "web-pkm-6c1e1",
  storageBucket: "web-pkm-6c1e1.firebasestorage.app",
  messagingSenderId: "39119738920",
  appId: "1:39119738920:web:2a056385a0c9c2a4e93d1d"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Ekspor layanan
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
