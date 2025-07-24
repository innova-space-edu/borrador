// CONFIG
const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// Estado global
let muted = false;
let chatHistory = [
  { role: "assistant", content: "¡Hola! Soy MIRA, tu asistente virtual. ¿En qué puedo ayudarte hoy?" }
];
let chatId = 1;

// ----------------------------
// UI: Mostrar historial
// ----------------------------
function renderHistory() {
  const chatBox = document.getElementById("chat-history");
  chatBox.innerHTML = "";
  for (let msg of chatHistory) {
    if (msg.role === "user") {
      chatBox.innerHTML += `<div class="bubble-user">${escapeHtml(msg.content)}</div>`;
    } else {
      // Render Markdown + LaTeX
      let html = marked.parse(msg.content);
      chatBox.innerHTML += `<div class="bubble-mira chat-markdown">${html}</div>`;
    }
  }
  // Actualiza MathJax
  if (window.MathJax) MathJax.typesetPromise();
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ----------------------------
// Avatar animación (hablando)
// ----------------------------
function setAvatarTalking(isTalking) {
  const avatar = document.getElementById("avatar-mira");
  if (!avatar) return;
  if (isTalking) avatar.classList.add("pulse");
  else avatar.classList.remove("pulse");
}

// ----------------------------
// Texto plano para voz (no leer LaTeX)
// ----------------------------
function plainTextForVoice(markdown) {
  // 1. Quitar $...$ y $$...$$ (fórmulas LaTeX)
  let text = markdown.replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*\$/g, ' ');
  // 2. Quitar Markdown bold/cursive
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1');
  // 3. Mejorar pausas: puntos y comas
  text = text.replace(/([.,;:!?])(\S)/g, "$1 $2");
  return text.replace(/\s+/g, ' ').trim();
}

// ----------------------------
// Voz: solo si no está muteado
// ----------------------------
function speak(text) {
  if (muted) return;
  const plain = plainTextForVoice(text);
  if (!plain) return;
  const msg = new SpeechSynthesisUtterance(plain);
  msg.lang = "es-ES";
  window.speechSynthesis.cancel();
  setAvatarTalking(true);
  msg.onend = () => setAvatarTalking(false);
  msg.onerror = () => setAvatarTalking(false);
  window.speechSynthesis.speak(msg);
}

// ----------------------------
// Escapar HTML para input user
// ----------------------------
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function (m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m];
  });
}

// ----------------------------
// ENVIAR mensaje
// ----------------------------
async function sendMessage() {
  const input = document.getElementById("user-input");
  const msg = input.value.trim();
  if (!msg) return;
  input.value = "";
  chatHistory.push({ role: "user", content: msg });
  renderHistory();

  // Mensaje de pensando...
  const chatBox = document.getElementById("chat-history");
  chatBox.innerHTML += `<div class="bubble-mira text-purple-300 italic">MIRA está pensando...</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    // Llamada API con historial para mejor contexto
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory.map(e => ({
        role: e.role === "assistant" ? "assistant" : "user",
        content: e.content
      }))
    ];
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.7
      })
    });
    const data = await response.json();
    let aiReply = data.choices?.[0]?.message?.content || "";

    // Reparar respuestas vacías: consulta Wikipedia
    if (!aiReply || aiReply.toLowerCase().includes("no encontré una respuesta")) {
      const wiki = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(msg)}`);
      const wikiData = await wiki.json();
      aiReply = wikiData.extract || "No tengo información sobre ese tema en este momento.";
    }

    // Guarda respuesta y muestra
    chatHistory.push({ role: "assistant", content: aiReply });
    renderHistory();
    speak(aiReply);

  } catch (err) {
    setAvatarTalking(false);
    chatBox.innerHTML += `<div class="bubble-mira">Error al conectar con la IA.</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

// ----------------------------
// Botones y entrada
// ----------------------------
document.getElementById("send-btn").onclick = sendMessage;
document.getElementById("user-input").addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// Volumen mute/desmute
document.getElementById("mute-btn").onclick = function () {
  muted = !muted;
  const icon = document.getElementById("mute-icon");
  if (muted) {
    icon.textContent = "🔇";
    this.classList.add("muted");
    window.speechSynthesis.cancel();
    setAvatarTalking(false);
  } else {
    icon.textContent = "🔊";
  }
};

// ----------------------------
// CHAT GUARDADO (simulado)
// ----------------------------
function newChat() {
  chatId++;
  chatHistory = [
    { role: "assistant", content: "¡Hola! Soy MIRA, tu asistente virtual. ¿En qué puedo ayudarte hoy?" }
  ];
  renderHistory();
}
function restoreChat(num) {
  // DEMO: solo reinicia. Para usar localStorage, implementa aquí
  newChat();
}

// ----------------------------
// PROMPT DEL SISTEMA
// ----------------------------
const SYSTEM_PROMPT = `
Responde como MIRA, asistente de Innova Space y OpenAI. 
Siempre explica primero con palabras claras, luego muestra fórmulas, ecuaciones o funciones en LaTeX. 
En las explicaciones, **no uses nunca signos de dólar ni código LaTeX** para las definiciones de variables, solo en la fórmula.
Ejemplo:
"La velocidad media es la variación de la posición dividida por la variación del tiempo.
La fórmula es:
$$
v_m = \\frac{\\Delta x}{\\Delta t}
$$
Donde:
vm es la velocidad media
Δx es el cambio en la posición
Δt es el cambio en el tiempo
¿Quieres un ejemplo o saber cómo aplicar esta fórmula?"

Sigue el hilo y contexto del usuario, adapta tu tono. Responde solo en español.
`;

// Inicial
document.addEventListener("DOMContentLoaded", () => {
  renderHistory();
});
