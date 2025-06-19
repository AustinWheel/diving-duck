import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAtAEu4NmdQfRrVo3JY69RVTFzMiTY-Z5A",
  authDomain: "warden-26d9b.firebaseapp.com",
  projectId: "warden-26d9b",
  storageBucket: "warden-26d9b.firebasestorage.app",
  messagingSenderId: "689193882708",
  appId: "1:689193882708:web:66fee54f45462a755049c1",
  measurementId: "G-7FGBJZBFQL",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;
