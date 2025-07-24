const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

let muted = false;
let volume = 1.0;
let conversation = [
  { role: "assistant", content: "¡Hola! Soy MIRA, tu asistente virtual. ¿En qué puedo ayudarte hoy?" }
];

function renderMarkdown(text) {
  // Renderiza markdown + latex a HTML
  let html = marked.parse(text);
  return html;
}

function addBubble(role, text) {
  const chatHistory = document.getElementById("chat-history");
  const div = document.createElement("div");
  div.className = (role === "user") ? "bubble-user" : "bubble-mira";
  div.innerHTML = (role === "user" ? text : "<strong>MIRA:</strong> " + renderMarkdown(text));
  chatHistory.appendChild(div);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  if (window.MathJax) MathJax.typesetPromise();
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function (m) {
    return ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m];
  });
}

function setAvatarTalking(isTalking) {
  const avatar = document.getElementById("avatar-mira");
  if (!avatar) return;
  if (isTalking) avatar.classList.add("pulse");
  else avatar.classList.remove("pulse");
}

// Voz y halo solo en texto limpio, saltando fórmulas
function plainTextForVoice(markdown) {
  let text = markdown.replace(/\$\$[\s\S]*?\$\$/g, ' ');
  text = text.replace(/\$[^$]*\$/g, ' ');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function speak(text) {
  if (muted) return;
  try {
    const plain = plainTextForVoice(text);
    if (!plain) return;
    const msg = new SpeechSynthesisUtterance(plain);
    msg.lang = "es-ES";
    msg.volume = volume;
    window.speechSynthesis.cancel();
    setAvatarTalking(true);
    msg.onend = () => setAvatarTalking(false);
    msg.onerror = () => setAvatarTalking(false);
    window.speechSynthesis.speak(msg);
  } catch {
    setAvatarTalking(false);
  }
}

// --- ENVÍO Y MANEJO DEL MENSAJE ---
async function sendMessage() {
  const input = document.getElementById("user-input");
  const userMessage = input.value.trim();
  if (!userMessage) return;

  addBubble("user", escapeHtml(userMessage));
  conversation.push({ role: "user", content: userMessage });
  input.value = "";

  // Mensaje de "pensando"
  addBubble("assistant", '<span class="text-purple-500 italic">MIRA está pensando...</span>');

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
          ...conversation.slice(-10)
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    // Elimina "MIRA está pensando..."
    const chatHistory = document.getElementById("chat-history");
    if (chatHistory.lastElementChild && chatHistory.lastElementChild.classList.contains("bubble-mira"))
      chatHistory.removeChild(chatHistory.lastElementChild);

    let aiReply = data.choices?.[0]?.message?.content || "";
    if (!aiReply || aiReply.toLowerCase().includes("no encontré una respuesta")) {
      // Consulta Wikipedia solo si es necesario
      const wiki = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(userMessage)}`);
      const wikiData = await wiki.json();
      aiReply = wikiData.extract || "No tengo suficiente información sobre eso.";
    }

    conversation.push({ role: "assistant", content: aiReply });
    addBubble("assistant", aiReply);
    speak(aiReply);

  } catch (error) {
    // Elimina "pensando"
    const chatHistory = document.getElementById("chat-history");
    if (chatHistory.lastElementChild && chatHistory.lastElementChild.classList.contains("bubble-mira"))
      chatHistory.removeChild(chatHistory.lastElementChild);
    addBubble("assistant", "Ocurrió un error al conectar con la IA.");
    setAvatarTalking(false);
    console.error(error);
  }
  setAvatarTalking(false);
}

// ---- VOLUMEN Y MUTE ----
document.getElementById("mute-btn").onclick = function () {
  muted = !muted;
  document.getElementById("mute-icon").textContent = muted ? "🔇" : "🔊";
};
document.getElementById("volume-slider").oninput = function (e) {
  volume = Number(e.target.value) / 100.0;
};

// --- INPUT Y BOTÓN ENVÍO ---
document.getElementById("send-btn").onclick = sendMessage;
document.getElementById("user-input").addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

// ---- LIMPIA TODO AL RECARGAR ----
window.onload = () => {
  document.getElementById("chat-history").innerHTML = "";
  conversation = [
    { role: "assistant", content: "¡Hola! Soy MIRA, tu asistente virtual. ¿En qué puedo ayudarte hoy?" }
  ];
  addBubble("assistant", conversation[0].content);
  setAvatarTalking(false);
  muted = false;
  volume = 1.0;
  document.getElementById("mute-icon").textContent = "🔊";
  document.getElementById("volume-slider").value = 100;
};

const SYSTEM_PROMPT = `
Eres MIRA, una asistente virtual de inteligencia artificial creada por Innova Space y OpenAI. Antes de escribir cualquier fórmula, ecuación o función, explica con palabras simples su significado. Después, muestra la fórmula en LaTeX para una mejor visualización, pero nunca expliques el código. No repitas símbolos LaTeX en listas de explicación. Si el usuario continúa con preguntas sobre el mismo tema, sigue el hilo usando el historial de la conversación. Organiza todo en párrafos y listas simples, NO en bloques de código. Si el usuario lo pide, resume los puntos clave.
Responde siempre en español. Ejemplo de explicación:
"La velocidad media es la variación de la posición dividido por la variación del tiempo.
La fórmula es:
$$
v_m = \\frac{\\Delta x}{\\Delta t}
$$
Donde:
- v_m es la velocidad media
- Δx es el cambio en la posición
- Δt es el cambio en el tiempo"
`;
