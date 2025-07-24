// == AVATAR flotante y movible
const avatar = document.getElementById("avatar-mira");
let dragging = false, offsetX = 0, offsetY = 0;
avatar.addEventListener("mousedown", function(e) {
  dragging = true;
  const rect = avatar.getBoundingClientRect();
  offsetX = rect.left - e.clientX;
  offsetY = rect.top - e.clientY;
  avatar.style.transition = "none";
  document.body.style.userSelect = "none";
});
document.addEventListener("mouseup", () => {
  dragging = false;
  avatar.style.transition = "";
  document.body.style.userSelect = "";
});
document.addEventListener("mousemove", function(e){
  if (!dragging) return;
  let nx = e.clientX + offsetX, ny = e.clientY + offsetY;
  nx = Math.max(10, Math.min(window.innerWidth - avatar.offsetWidth - 8, nx));
  ny = Math.max(10, Math.min(window.innerHeight - avatar.offsetHeight - 8, ny));
  avatar.style.left = nx + "px";
  avatar.style.top = ny + "px";
});

// == SIDEBAR toggle
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");
function closeSidebar() { document.body.classList.remove("sidebar-open"); document.body.classList.add("sidebar-closed"); }
function openSidebar()  { document.body.classList.remove("sidebar-closed"); document.body.classList.add("sidebar-open"); }
sidebarToggle.onclick = function() {
  if (document.body.classList.contains("sidebar-open")) closeSidebar();
  else openSidebar();
};
// Empieza cerrado
closeSidebar();

// Áreas desplegable
const areasBtn = document.getElementById("areas-btn");
const areasList = document.getElementById("areas-list");
const areasArrow = document.getElementById("areas-arrow");
areasBtn.onclick = () => {
  areasList.classList.toggle("open");
  areasArrow.textContent = areasList.classList.contains("open") ? "▲" : "▼";
};

// ========== CHAT FUNCIONES PRINCIPALES ========== //
const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

let chatHistory = [];
let voiceActive = true;

// Volume/Mute control
const volBtn = document.getElementById("volume-btn");
volBtn.onclick = function() {
  voiceActive = !voiceActive;
  volBtn.classList.toggle("active", voiceActive);
};

// Mensaje inicial
const chatContainer = document.getElementById("chat-container");
function addMessage(role, content) {
  const div = document.createElement("div");
  div.innerHTML = (role === "user"
    ? `<strong style="color:#e6beff">Tú:</strong> ` + escapeHtml(content)
    : `<strong style="color:#97e5ff">MIRA:</strong> ` + renderMarkdown(content)
  );
  div.style.marginBottom = "0.7em";
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  if (role === "assistant" && voiceActive) speak(content);
  if (window.MathJax) MathJax.typesetPromise();
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
function renderMarkdown(text) { return marked.parse(text || ""); }

// ========== Voz: SOLO LEE EXPLICACIONES, NO FORMULAS ========== //
function speak(markdown) {
  // Quitar LaTeX y tablas, limpiar para voz natural
  let text = markdown.replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Mejor pausa en puntos, comas, etc.
  text = text.replace(/([.,;:!?\n])/g, "$1 ");
  if (text && voiceActive) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "es-ES";
    msg.rate = 1.0; msg.pitch = 1.04;
    window.speechSynthesis.cancel();
    msg.onend = msg.onerror = () => {};
    window.speechSynthesis.speak(msg);
  }
}

// Prompt simple para máxima compatibilidad
const SYSTEM_PROMPT = `
Eres MIRA, una asistente virtual amigable y experta en todas las materias escolares. Responde siempre en español, de forma clara, útil y fácil de entender.
`;

// Render mensaje inicial al cargar
window.addEventListener("DOMContentLoaded", () => {
  chatContainer.innerHTML = "";
  addMessage("assistant", "¡Hola! Soy MIRA, tu asistente virtual. ¿En qué puedo ayudarte hoy?");
});

// ========== ENVÍO Y API ========== //
const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
userInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") { sendBtn.click(); }
});
sendBtn.onclick = async function() {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage("user", text);
  chatHistory.push({role:"user",content:text});
  userInput.value = "";
  // Loading...
  addMessage("assistant", '<span style="color:#a2adf0;font-style:italic">MIRA está pensando...</span>');

  // Contexto corto (últimos 5 mensajes)
  const historyToSend = chatHistory.slice(-5);
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...historyToSend
        ],
        temperature: 0.75
      })
    });
    const data = await resp.json();
    console.log("Respuesta API:", data);
    // Quita el "pensando"
    chatContainer.lastChild?.remove();
    // Chequear diferentes formatos de respuesta
    let content = (
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.text ||
      data.choices?.[0]?.content ||
      "No entendí la respuesta. ¿Puedes intentar de nuevo?"
    );
    addMessage("assistant", content);
    chatHistory.push({role:"assistant",content});
  } catch (e) {
    chatContainer.lastChild?.remove();
    addMessage("assistant", "Error de conexión o respuesta. Intenta de nuevo.");
  }
};

// === Guardar chat en localStorage
const savedChatsList = document.getElementById("saved-chats");
const newChatBtn = document.getElementById("new-chat-btn");

function saveChat(name, history) {
  let chats = JSON.parse(localStorage.getItem("miraChats") || "[]");
  chats.push({name, history});
  localStorage.setItem("miraChats", JSON.stringify(chats));
  renderSavedChats();
}
function renderSavedChats() {
  let chats = JSON.parse(localStorage.getItem("miraChats") || "[]");
  savedChatsList.innerHTML = "";
  chats.forEach((chat, idx) => {
    const li = document.createElement("li");
    li.textContent = chat.name;
    li.style.cursor = "pointer";
    li.onclick = () => loadChat(idx);
    savedChatsList.appendChild(li);
  });
}
function loadChat(idx) {
  let chats = JSON.parse(localStorage.getItem("miraChats") || "[]");
  if (!chats[idx]) return;
  chatHistory = chats[idx].history.slice();
  chatContainer.innerHTML = "";
  for (const msg of chatHistory) {
    addMessage(msg.role === "user" ? "user" : "assistant", msg.content);
  }
}
newChatBtn.onclick = () => {
  const nombre = "Chat " + (Math.floor(Math.random() * 900) + 100);
  saveChat(nombre, chatHistory);
  chatHistory = [];
  chatContainer.innerHTML = "";
  addMessage("assistant", "¡Nuevo chat iniciado!");
};

renderSavedChats();
