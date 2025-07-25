// auth.js
import { auth } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/**
 * Intenta iniciar sesión con el correo y contraseña.
 * Si no existe, crea una cuenta automáticamente.
 */
export async function loginOrRegister(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    // Si el usuario no existe, lo crea
    await createUserWithEmailAndPassword(auth, email, password);
  }
}

/**
 * Detecta el estado del usuario autenticado.
 * Si no hay sesión activa, redirige a login.
 */
export function monitorAuthState(onLoggedIn) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      onLoggedIn(user);
    } else {
      window.location.href = "login.html";
    }
  });
}
