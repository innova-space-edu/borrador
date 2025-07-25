// utils/auth.js
import { auth } from "../firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Inicia sesión o crea cuenta si no existe
export async function loginOrRegister(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    await createUserWithEmailAndPassword(auth, email, password);
  }
}

// Monitorea si hay usuario autenticado. Si no, redirige a login.html
export function checkAuthAndRedirect() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "login.html";
    }
  });
}

// Devuelve una promesa que se resuelve cuando hay usuario
export function waitForUser() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
    });
  });
}
