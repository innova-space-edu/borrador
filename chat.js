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

// Configuración general
const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

let chatHistory = [];
let voiceActive = true;

const volBtn = document.getElementById("volume-btn");
const volIcon = document.getElementById("vol-icon");
volBtn.onclick = () => {
  voiceActive = !voiceActive;
  volIcon.textContent = voiceActive ? "🔊" : "🔇";
};

const chatContainer = document.getElementById("chat-container");
function addMessage(role, content) {
  const div = document.createElement("div");
  div.innerHTML = (role === "user"
    ? `<strong style="color:#d8b4fe">Tú:</strong> ` + escapeHtml(content)
    : `<strong style="color:#a5f3fc">MIRA:</strong> ` + renderMarkdown(content)
  );
  div.style.marginBottom = "1em";
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  if (role === "assistant" && voiceActive) speak(content);
  if (window.MathJax) MathJax.typesetPromise();
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}
function renderMarkdown(text) {
  return marked.parse(text || "");
}

function speak(markdown) {
  let text = markdown
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$]*\$/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/([.,;:!?\n])/g, "$1 ")
    .trim();
  if (text && voiceActive) {
    const msg = new SpeechSynthesisUtterance(text);
    msg.lang = "es-ES";
    msg.rate = 1.0;
    msg.pitch = 1.04;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  }
}

const SYSTEM_PROMPT = `
Eres MIRA, una asistente virtual de inteligencia artificial creada por Innova Space y OpenAI. Diseñada para apoyar a estudiantes y profesores en todas las materias escolares. Responde siempre en español, de forma clara, amable y ordenada.

Cuando te pidan una fórmula o ecuación:
1. Explica el concepto con palabras simples.
2. Muestra la fórmula en LaTeX usando $ o $$.
3. Explica las variables.
4. Da un ejemplo si es posible.
`;

window.addEventListener("DOMContentLoaded", () => {
  addMessage("assistant", "¡Hola! Soy MIRA. ¿En qué te puedo ayudar?");
});

const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");

userInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") sendBtn.click();
});

sendBtn.onclick = async function() {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage("user", text);
  chatHistory.push({role:"user",content:text});
  userInput.value = "";
  addMessage("assistant", '<span style="color:#a2adf0;font-style:italic">MIRA está pensando...</span>');

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
          { role: "system", content: SYSTEM_PROMPT },
          ...chatHistory.slice(-5)
        ],
        temperature: 0.75
      })
    });

    const data = await response.json();
    chatContainer.lastChild?.remove();
    let content = data.choices?.[0]?.message?.content || "No entendí la respuesta.";
    addMessage("assistant", content);
    chatHistory.push({role:"assistant",content});
  } catch (e) {
    chatContainer.lastChild?.remove();
    addMessage("assistant", "Error de conexión o respuesta. Intenta de nuevo.");
  }
};
