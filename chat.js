// ==== Configuración ====
const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const MAX_HISTORY = 12; // máximo de mensajes recordados

// ==== Volumen/voz ====
let voiceEnabled = true;
const volumeBtn = document.getElementById("volume-btn");
const volumeIcon = document.getElementById("volume-icon");
volumeBtn.onclick = () => {
  voiceEnabled = !voiceEnabled;
  volumeBtn.classList.toggle("muted", !voiceEnabled);
  volumeIcon.textContent = voiceEnabled ? "🔊" : "🔇";
  localStorage.setItem("mira-voice", voiceEnabled ? "1" : "0");
};
if (localStorage.getItem("mira-voice") === "0") {
  voiceEnabled = false;
  volumeBtn.classList.add("muted");
  volumeIcon.textContent = "🔇";
}

// ==== Chat histórico ====
let chatHistory = [];
if (localStorage.getItem("mira-chat-history")) {
  try {
    chatHistory = JSON.parse(localStorage.getItem("mira-chat-history")) || [];
  } catch { chatHistory = []; }
}

// ==== Guardar historial ====
function saveHistory() {
  localStorage.setItem("mira-chat-history", JSON.stringify(chatHistory.slice(-MAX_HISTORY)));
}

// ==== Mostrar mensajes ====
function renderChat() {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML = "";
  for (const msg of chatHistory) {
    if (msg.role === "user") {
      chatBox.innerHTML += `<div class="msg-user">${escapeHtml(msg.content)}</div>`;
    } else {
      chatBox.innerHTML += `<div class="msg-ai chat-markdown">${renderMarkdown(msg.content)}</div>`;
    }
  }
  if (window.MathJax) MathJax.typesetPromise();
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==== Enviar mensaje ====
async function sendMessage() {
  const input = document.getElementById("user-input");
  const userMessage = input.value.trim();
  if (!userMessage) return;

  chatHistory.push({role:"user", content: userMessage});
  saveHistory();
  renderChat();
  input.value = "";
  showThinking();

  // Limitar historial
  let history = chatHistory.slice(-MAX_HISTORY);

  // Prompt mejorado (sin negaciones fuertes)
  const SYSTEM_PROMPT = `
Eres MIRA, la asistente virtual de Innova Space Education y OpenAI.
- Si el usuario pide una fórmula, ecuación o función, primero explícalo con palabras claras, luego muéstrala en LaTeX.
- Ejemplo: "La velocidad media es la variación de la posición dividido por la variación del tiempo. La fórmula es: $$v_m = \\frac{\\Delta x}{\\Delta t}$$"
- En las definiciones, nunca uses símbolos LaTeX: escribe solo en texto normal. Ejemplo: "v_m es la velocidad media, Δx es el cambio en la posición, Δt es el cambio en el tiempo."
- Si ves palabras mal escritas, errores o frases poco claras, corrige y responde como si estuviera bien escrito.
- Sigue el contexto y mantén la conversación, aunque las preguntas sean cortas o repetidas.
- Usa frases completas, listas y resalta ideas importantes en negrita usando Markdown.
- Si puedes, da siempre un ejemplo o resumen breve al final.
- Responde SIEMPRE en español.
  `;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {role: "system", content: SYSTEM_PROMPT},
          ...history.map(m => ({role: m.role, content: m.content}))
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    document.getElementById("thinking")?.remove();
    let aiReply = data.choices?.[0]?.message?.content || "";

    // Si el modelo no responde nada útil, busca en Wikipedia
    if (!aiReply || aiReply.trim() === "" || aiReply.toLowerCase().includes("no encontr")) {
      const wiki = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(userMessage)}`);
      const wikiData = await wiki.json();
      aiReply = wikiData.extract || "Lo siento, no encontré una respuesta adecuada.";
    }

    chatHistory.push({role:"assistant", content: aiReply});
    saveHistory();
    renderChat();
    speak(aiReply);

  } catch (error) {
    document.getElementById("thinking")?.remove();
    chatHistory.push({role:"assistant", content:"<span style='color:#fc7b7b'>Error al conectar con la IA.</span>"});
    renderChat();
    console.error(error);
  }
}

// ==== Mostrar pensando... ====
function showThinking() {
  const chatBox = document.getElementById("chat-box");
  chatBox.innerHTML += `<div id="thinking" class="text-purple-300 italic mb-4 animate-pulse">MIRA está pensando...</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==== Markdown + MathJax ====
function renderMarkdown(text) {
  return marked.parse(text || "");
}
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function (m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m];
  });
}

// ==== Voz solo para explicaciones ====
function plainTextForVoice(markdown) {
  // Quitar $...$ $$...$$ y limpiar
  let text = markdown.replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/([.,;:!])(\S)/g, '$1 $2')
    .trim();
  return text;
}
function speak(text) {
  if (!voiceEnabled) return;
  try {
    const plain = plainTextForVoice(text);
    if (!plain) return;
    const msg = new SpeechSynthesisUtterance(plain);
    msg.lang = "es-ES";
    msg.rate = 1.04;
    window.speechSynthesis.cancel();
    msg.onend = () => {};
    msg.onerror = () => {};
    window.speechSynthesis.speak(msg);
  } catch {}
}

// ==== Panel lateral desplegable ====
const panel = document.getElementById("side-panel");
const toggleBtn = document.getElementById("panel-toggle");
let panelOpen = false;
toggleBtn.onclick = () => {
  panelOpen = !panelOpen;
  panel.className = panelOpen ? "open shadow-2xl flex flex-col px-7 py-8 h-full" : "closed shadow-2xl flex flex-col px-7 py-8 h-full";
};
panel.className = "closed shadow-2xl flex flex-col px-7 py-8 h-full";

// ==== Areas desplegable ====
const areasBtn = document.querySelector("#areas-dropdown .dropdown-btn");
const areasDrop = document.querySelector("#areas-dropdown");
areasBtn.onclick = () => areasDrop.classList.toggle("open");

// ==== Avatar flotante movible ====
const avatar = document.getElementById("avatar-float");
let isDragging = false, offset = {x:0, y:0};
avatar.addEventListener("mousedown", function(e) {
  isDragging = true;
  offset = {
    x: avatar.offsetLeft - e.clientX,
    y: avatar.offsetTop - e.clientY
  };
  avatar.style.transition = "none";
});
document.addEventListener("mouseup", () => { isDragging = false; avatar.style.transition = ""; });
document.addEventListener("mousemove", function(e){
  if (!isDragging) return;
  let nx = e.clientX + offset.x, ny = e.clientY + offset.y;
  // límites para que no se salga
  nx = Math.max(12, Math.min(window.innerWidth-130, nx));
  ny = Math.max(12, Math.min(window.innerHeight-130, ny));
  avatar.style.left = nx + "px";
  avatar.style.top = ny + "px";
});

// ==== Chats guardados (demo básico) ====
const savedChats = document.getElementById("saved-chats");
const newChatBtn = document.getElementById("new-chat-btn");
function saveCurrentChat() {
  let all = JSON.parse(localStorage.getItem("mira-chats")||"[]");
  all.push(chatHistory);
  localStorage.setItem("mira-chats", JSON.stringify(all));
}
function loadSavedChats() {
  let all = JSON.parse(localStorage.getItem("mira-chats")||"[]");
  savedChats.innerHTML = "";
  all.forEach((c,i)=> {
    const li = document.createElement("li");
    li.innerHTML = `<a class="side-link" href="#">Chat ${i+1}</a>`;
    li.onclick = () => { chatHistory = c; renderChat(); };
    savedChats.appendChild(li);
  });
}
newChatBtn.onclick = () => { saveCurrentChat(); chatHistory = []; saveHistory(); renderChat(); loadSavedChats(); };
loadSavedChats();

// ==== Inicialización ====
window.addEventListener('DOMContentLoaded', () => {
  // Primer saludo solo si está vacío
  if (chatHistory.length === 0) {
    chatHistory = [{role:"assistant",content:"¡Hola! Soy MIRA, tu asistente virtual. ¿En qué puedo ayudarte hoy?"}];
    saveHistory();
  }
  renderChat();
});

