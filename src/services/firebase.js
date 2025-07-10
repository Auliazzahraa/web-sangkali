// Firebase v9+ modular
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDQJqHqomC-qXRcAzhpJnQBcxv-6KsBd_M",
  authDomain: "web-pkm-6c1e1.firebaseapp.com",
  projectId: "web-pkm-6c1e1",
  storageBucket: "web-pkm-6c1e1.firebasestorage.app",
  messagingSenderId: "39119738920",
  appId: "1:39119738920:web:2a056385a0c9c2a4e93d1d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
