
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "pigeon-program",
  appId: "1:598664408513:web:61586559d0e5e057f05340",
  storageBucket: "pigeon-program.appspot.com",
  apiKey: "AIzaSyBEb0m_gBftTfWFZYgXWM6KMdzBnb_LOL4",
  authDomain: "pigeon-program.firebaseapp.com",
  messagingSenderId: "598664408513",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
