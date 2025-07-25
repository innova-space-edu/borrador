// chat.js
import { app, db } from "./firebase-config.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { speak } from "./utils/speak.js";
import { renderMessage } from "./utils/render.js";

const chatContainer = document.getElementById("chat-container");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const avatar = document.getElementById("avatar");
const typing = document.getElementById("typing-indicator");
const fileInput = document.getElementById("image-upload");

const auth = getAuth(app);
const API_KEY = "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";
let currentUser = null;

sendBtn.onclick = () => handleSend();
input.addEventListener("keydown", e => e.key === "Enter" && handleSend());

onAuthStateChanged(auth, async user => {
  if (!user) return (window.location.href = "login.html");
  currentUser = user;
  await loadMessages();
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
      body: JSON.stringify({ model: "meta-llama/llama-4-scout-17b-16e-instruct", messages, temperature: 0.7 })
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

async function saveMessage(role, content) {
  if (!currentUser) return;
  await addDoc(collection(db, "chats", currentUser.uid, "mensajes"), {
    role,
    content,
    timestamp: Date.now()
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

// Drag avatar
avatar?.addEventListener("mousedown", e => {
  const offsetX = e.clientX - avatar.offsetLeft;
  const offsetY = e.clientY - avatar.offsetTop;
  const drag = e => {
    avatar.style.left = `${e.clientX - offsetX}px`;
    avatar.style.top = `${e.clientY - offsetY}px`;
  };
  const stop = () => {
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stop);
  };
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stop);
});

// File upload
fileInput?.addEventListener("change", e => {
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
