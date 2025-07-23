const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `
Eres MIRA, una asistente virtual de inteligencia artificial creada por Innova Space y OpenAI.
Responde SIEMPRE con estructura ordenada y clara, adaptando el nivel de detalle y tono al usuario.
Evita asteriscos innecesarios, bloques de código y frases como “soy una IA”.
Cuando expliques conceptos matemáticos, incluye una explicación clara seguida de la fórmula en LaTeX.
Usa español neutro y responde directo al punto.
`;

// 🧠 Memoria conversacional
let historial = [];
let temaActual = null;
let tiempoUltimaInteraccion = Date.now();
const LIMITE_TIEMPO = 10 * 60 * 1000;

function detectarTema(msg) {
  const temas = {
    "riesgo": "riesgos naturales",
    "clima": "clima y medioambiente",
    "salud": "salud y bienestar",
    "inteligencia": "inteligencia artificial",
    "robot": "tecnología y robótica",
    "internet": "tecnología e información",
    "planificación": "planificaciones escolares",
    "profesor": "educación",
    "satélite": "tecnología espacial"
  };
  msg = msg.toLowerCase();
  return Object.keys(temas).find(p => msg.includes(p)) ? temas[Object.keys(temas).find(p => msg.includes(p))] : null;
}

function actualizarTema(mensaje) {
  const nuevoTema = detectarTema(mensaje);
  const ahora = Date.now();
  if (nuevoTema) {
    temaActual = nuevoTema;
    tiempoUltimaInteraccion = ahora;
  } else if (ahora - tiempoUltimaInteraccion > LIMITE_TIEMPO) {
    temaActual = null;
    historial = [];
  }
}

function generarPrompt(mensaje) {
  actualizarTema(mensaje);
  const contexto = temaActual ? `Tema actual: ${temaActual}\n` : "";
  const his = historial.slice(-5).map(m => `Usuario: ${m.u}\nMIRA: ${m.m}`).join("\n");
  return `${contexto}${his}\nUsuario: ${mensaje}\nMIRA:`;
}

function agregarHistorial(u, m) {
  historial.push({ u, m });
  tiempoUltimaInteraccion = Date.now();
}

// 💬 Animación del avatar
function setAvatarTalking(isTalking) {
  const avatar = document.getElementById("avatar-mira");
  if (!avatar) return;
  avatar.classList.toggle("pulse", isTalking);
}

// 🔊 Voz hablada (limpia LaTeX y Markdown)
function plainTextForVoice(markdown) {
  return markdown
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function speak(text) {
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

// 🧠 Markdown y MathJax
function renderMarkdown(text) {
  return marked.parse(text);
}

// Pensando...
function showThinking() {
  const chatBox = document.getElementById("chat-box");
  const thinking = document.createElement("div");
  thinking.id = "thinking";
  thinking.className = "text-purple-300 italic";
  thinking.innerHTML = `<span class="animate-pulse">MIRA está pensando<span class="animate-bounce">...</span></span>`;
  chatBox.appendChild(thinking);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// HTML seguro
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// 📤 Enviar mensaje
async function sendMessage() {
  const input = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");
  const userMessage = input.value.trim();
  if (!userMessage) return;

  chatBox.innerHTML += `<div><strong>Tú:</strong> ${escapeHtml(userMessage)}</div>`;
  input.value = "";
  showThinking();

  try {
    const prompt = generarPrompt(userMessage);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    const data = await response.json();
    document.getElementById("thinking")?.remove();
    let aiReply = data.choices?.[0]?.message?.content || "Lo siento, no encontré respuesta.";

    agregarHistorial(userMessage, aiReply);

    const html = renderMarkdown(aiReply);
    chatBox.innerHTML += `<div><strong>MIRA:</strong> <span class="chat-markdown">${html}</span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    speak(aiReply);
    if (window.MathJax) MathJax.typesetPromise();

  } catch (error) {
    document.getElementById("thinking")?.remove();
    chatBox.innerHTML += `<div><strong>MIRA:</strong> Error al conectar con la IA.</div>`;
    setAvatarTalking(false);
    console.error(error);
  }
}

// 🟣 Auto saludo inicial
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    speak("¡Hola! Soy MIRA, tu asistente virtual. ¿En qué puedo ayudarte hoy?");
    setAvatarTalking(false);
  }, 800);
});

// ⌨️ Enter para enviar
document.getElementById("user-input").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// Inicializar estado visual
setAvatarTalking(false);
