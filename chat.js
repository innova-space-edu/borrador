// chat.js actualizado con panel lateral, sugerencias, memoria por chat, voz, iconos
const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

let chats = JSON.parse(localStorage.getItem("mira_chats")) || {};
let chatId = localStorage.getItem("mira_chat_actual") || crearNuevoChat();

let tiempoUltimaInteraccion = Date.now();
const LIMITE_TIEMPO = 5 * 60 * 1000; // 5 minutos

const SYSTEM_PROMPT = `Eres MIRA, una IA educativa de Innova Space. Responde con claridad, usando ejemplos, voz hablada y sugerencias didácticas. Usa iconos según el contenido. Siempre habla.`;

function crearNuevoChat() {
  const id = Date.now().toString();
  chats[id] = [];
  localStorage.setItem("mira_chat_actual", id);
  localStorage.setItem("mira_chats", JSON.stringify(chats));
  renderListaChats();
  document.getElementById("chat-box").innerHTML = "";
  return id;
}

function renderListaChats() {
  const lista = document.getElementById("lista-chats");
  if (!lista) return;
  lista.innerHTML = Object.keys(chats).map(id => `<div onclick="cambiarChat('${id}')" class="cursor-pointer hover:text-purple-400">Chat ${id}</div>`).join("");
}

function cambiarChat(id) {
  chatId = id;
  localStorage.setItem("mira_chat_actual", id);
  renderChat();
}

function renderChat() {
  const chat = chats[chatId] || [];
  const box = document.getElementById("chat-box");
  box.innerHTML = chat.map(msg => `<div><strong>Tú:</strong> ${escapeHtml(msg.u)}</div><div><strong>MIRA:</strong> <span class='chat-markdown'>${renderMarkdown(msg.m)}</span></div>`).join("");
  box.scrollTop = box.scrollHeight;
}

function setAvatarTalking(active) {
  const avatar = document.getElementById("avatar-mira");
  if (avatar) avatar.classList.toggle("pulse", active);
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function plainTextForVoice(text) {
  return text.replace(/\*\*|\*|__|_|\$.*?\$/g, "").replace(/\s+/g, " ").trim();
}

function speak(text) {
  try {
    const msg = new SpeechSynthesisUtterance(plainTextForVoice(text));
    msg.lang = "es-ES";
    window.speechSynthesis.cancel();
    setAvatarTalking(true);
    msg.onend = () => setAvatarTalking(false);
    window.speechSynthesis.speak(msg);
  } catch {
    setAvatarTalking(false);
  }
}

function renderMarkdown(text) {
  return marked.parse(text);
}

function generarPrompt(mensaje) {
  const ahora = Date.now();
  if (ahora - tiempoUltimaInteraccion > LIMITE_TIEMPO) chats[chatId] = [];
  tiempoUltimaInteraccion = ahora;
  const his = chats[chatId].slice(-5).map(m => `Usuario: ${m.u}\nMIRA: ${m.m}`).join("\n");
  return `${his}\nUsuario: ${mensaje}\nMIRA:`;
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const box = document.getElementById("chat-box");
  const msg = input.value.trim();
  if (!msg) return;

  box.innerHTML += `<div><strong>Tú:</strong> ${escapeHtml(msg)}</div>`;
  input.value = "";
  box.scrollTop = box.scrollHeight;

  const prompt = generarPrompt(msg);
  const res = await obtenerRespuestaIA(prompt);
  chats[chatId].push({ u: msg, m: res });
  localStorage.setItem("mira_chats", JSON.stringify(chats));

  const html = renderMarkdown(res);
  box.innerHTML += `<div><strong>MIRA:</strong> <span class='chat-markdown'>${html}</span></div>`;
  sugerenciasDidacticas(box);
  speak(res);
  box.scrollTop = box.scrollHeight;
}

async function obtenerRespuestaIA(prompt) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    })
  });
  const data = await r.json();
  return data.choices?.[0]?.message?.content || "Lo siento, no encontré respuesta.";
}

function sugerenciasDidacticas(box) {
  const s = document.createElement("div");
  s.className = "text-xs text-purple-300 italic mt-2";
  s.innerHTML = `✨ Sugerencias: 
    <button onclick="enviarSugerencia('Déjame darte un resumen de lo que llevamos.')" class="underline">Resumen</button> |
    <button onclick="enviarSugerencia('Muéstrame un ejemplo relacionado.')" class="underline">Ejemplo</button> |
    <button onclick="enviarSugerencia('Quiero avanzar al siguiente tema.')" class="underline">Avanzar</button>`;
  box.appendChild(s);
}

function enviarSugerencia(texto) {
  document.getElementById("user-input").value = texto;
  sendMessage();
}

document.getElementById("user-input").addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

window.addEventListener("DOMContentLoaded", () => {
  renderListaChats();
  renderChat();
  speak("Hola, soy MIRA. ¿En qué puedo ayudarte hoy?");
});
