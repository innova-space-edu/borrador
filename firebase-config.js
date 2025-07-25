// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCPNds1Tc_BYM5DYroW9-3ZzgeQV1pv0KI",
  authDomain: "innovaspaceai.firebaseapp.com",
  projectId: "innovaspaceai",
  storageBucket: "innovaspaceai.appspot.com",
  messagingSenderId: "488908178763",
  appId: "1:488908178763:web:118fb583571c9934a614ce",
  measurementId: "G-C1RF3TZZ2X"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
