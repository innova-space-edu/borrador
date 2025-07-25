// === VARIABLES Y ELEMENTOS ===
const chatContainer = document.getElementById("chat-container");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const avatar = document.getElementById("avatar");
const typing = document.getElementById("typing-indicator");
const fileInput = document.getElementById("image-upload");

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);
let currentUser = null;

const API_KEY = "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";

// === FUNCIONES DE CHAT ===
function renderMessage(role, content) {
  const msg = document.createElement("div");
  msg.className = `message ${role === "user" ? "user" : "bot"}`;
  msg.innerHTML = marked.parse(content);
  chatContainer.appendChild(msg);
  MathJax.typesetPromise();
  msg.scrollIntoView({ behavior: "smooth", block: "start" });
  if (role === "assistant") {
    speak(content);
    avatar.classList.add("talking");
    setTimeout(() => avatar.classList.remove("talking"), 1200);
  }
}

function speak(text) {
  const cleaned = text.replace(/\$\$.*?\$\$/gs, "").replace(/\$.*?\$/g, "");
  const msg = new SpeechSynthesisUtterance(cleaned);
  msg.lang = "es-ES";
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
}

async function saveMessage(role, content) {
  if (!currentUser) return;
  await addDoc(collection(db, "chats", currentUser.uid, "mensajes"), {
    role,
    content,
    timestamp: Date.now(),
  });
}

async function loadMessages() {
  if (!currentUser) return;
  const q = query(collection(db, "chats", currentUser.uid, "mensajes"), orderBy("timestamp"));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach(doc => {
    const { role, content } = doc.data();
    renderMessage(role, content);
  });
}

// === ENVÍO Y RESPUESTA ===
sendBtn.onclick = () => handleSend();
input.addEventListener("keydown", e => {
  if (e.key === "Enter") handleSend();
});

async function handleSend() {
  const question = input.value.trim();
  if (!question) return;
  renderMessage("user", question);
  await saveMessage("user", question);
  input.value = "";
  getResponse(question);
}

async function getResponse(prompt) {
  typing.textContent = "MIRA está escribiendo...";
  try {
    const messages = [
      { role: "system", content: "Eres MIRA, una IA educativa amable y clara. Usa asteriscos para enfatizar palabras." },
      { role: "user", content: prompt }
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages,
        temperature: 0.7
      })
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "Lo siento, no entendí.";
    renderMessage("assistant", content);
    await saveMessage("assistant", content);
  } catch {
    renderMessage("assistant", "Error al conectar con la IA.");
  } finally {
    typing.textContent = "";
  }
}

// === MOVER AVATAR ===
avatar.addEventListener("mousedown", startDrag);
function startDrag(e) {
  const offsetX = e.clientX - avatar.offsetLeft;
  const offsetY = e.clientY - avatar.offsetTop;
  function drag(e) {
    avatar.style.left = `${e.clientX - offsetX}px`;
    avatar.style.top = `${e.clientY - offsetY}px`;
  }
  function stopDrag() {
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
  }
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stopDrag);
}

// === CARGA DE IMÁGENES ===
fileInput?.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const imgHtml = `<img src="${reader.result}" alt="Imagen subida" style="max-width:100%; border-radius:12px" />`;
    renderMessage("user", "[Imagen cargada]\n" + imgHtml);
    saveMessage("user", "[Imagen cargada]");
  };
  reader.readAsDataURL(file);
});

// === AUTENTICACIÓN ===
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    loadMessages();
  } else {
    window.location.href = "login.html";
  }
});
