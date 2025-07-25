import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password)
    .catch(() => createUserWithEmailAndPassword(auth, email, password));
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    const email = prompt("Ingresa tu correo:");
    const password = prompt("Ingresa tu contraseña:");
    login(email, password);
  }
});
