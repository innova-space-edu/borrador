const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// Prompt didáctico y positivo, sigue el hilo, explica antes de mostrar fórmulas.
const SYSTEM_PROMPT = `
Eres MIRA, una asistente virtual educativa creada por Innova Space y OpenAI.

Responde siempre de forma clara, amable y estructurada, como ChatGPT. Utiliza títulos, listas, tablas y explicaciones sencillas.

Cuando te pidan una fórmula, ecuación o función:
- Explica primero con una frase sencilla y clara lo que representa esa fórmula.
- Después, muestra la fórmula escrita en LaTeX para que se vea ordenada y bonita.

Cuando expliques el significado de cada variable, escríbelo en texto simple, para que el usuario pueda leerlo y escucharlo fácilmente (ejemplo: v_m es la velocidad media).

Haz las explicaciones lo más comprensibles y didácticas posible, como para estudiantes de secundaria.
Corrige automáticamente errores ortográficos o palabras mal escritas. Si la pregunta es ambigua, interpreta lo más probable o pide aclaración, pero siempre intenta ayudar.

Mantén el hilo de la conversación: responde a preguntas de seguimiento (“otro ejemplo”, “explícalo de nuevo”, “hazlo más fácil”, etc.) usando el contexto anterior.

Responde siempre en español, a menos que el usuario pida otro idioma.
`;

// Maneja la animación del avatar
function setAvatarTalking(isTalking) {
  const avatar = document.getElementById("avatar-mira");
  if (!avatar) return;
  if (isTalking) avatar.classList.add("pulse");
  else avatar.classList.remove("pulse");
}

// Permite enviar con Enter
document.getElementById("user-input").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

// Indicador "pensando"
function showThinking() {
  const chatBox = document.getElementById("chat-box");
  const thinking = document.createElement("div");
  thinking.id = "thinking";
  thinking.className = "text-purple-500 italic";
  thinking.innerHTML = `<span class="animate-pulse">MIRA está pensando<span class="animate-bounce">...</span></span>`;
  chatBox.appendChild(thinking);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Lee solo explicaciones (omite líneas con fórmulas o LaTeX)
function plainTextForVoice(markdown) {
  let text = markdown
    .split('\n')
    .filter(line =>
      !line.trim().startsWith('$$') && !line.trim().endsWith('$$') &&
      !line.includes('$') &&
      !/^ {0,3}`/.test(line)
    )
    .join('. ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/([.,;:!?\)])([^\s.])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  text = text.replace(/\.{2,}/g, '.').replace(/\. \./g, '. ');
  return text;
}

function speak(text) {
  try {
    const plain = plainTextForVoice(text);
    if (!plain) return;
    const msg = new SpeechSynthesisUtterance(plain);
    msg.lang = "es-ES";
    msg.rate = 1.00;
    window.speechSynthesis.cancel();
    setAvatarTalking(true);
    msg.onend = () => setAvatarTalking(false);
    msg.onerror = () => setAvatarTalking(false);
    window.speechSynthesis.speak(msg);
  } catch {
    setAvatarTalking(false);
  }
}

function renderMarkdown(text) {
  return marked.parse(text);
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

// Mantén el historial para memoria de contexto (¡importante!)
const chatHistory = [
  { role: "system", content: SYSTEM_PROMPT }
];

// Mensaje de bienvenida hablado (solo texto, sin "MIRA:")
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    speak("¡Hola! Soy MIRA, tu asistente virtual. ¿En qué puedo ayudarte hoy?");
    setAvatarTalking(false);
  }, 900);
});

async function sendMessage() {
  const input = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");
  const userMessage = input.value.trim();
  if (!userMessage) return;

  chatBox.innerHTML += `<div><strong>Tú:</strong> ${escapeHtml(userMessage)}</div>`;
  input.value = "";
  showThinking();

  chatHistory.push({ role: "user", content: userMessage });

  // Solo últimos 12 mensajes para no perder contexto (ajusta si deseas)
  if (chatHistory.length > 13) {
    chatHistory.splice(1, chatHistory.length - 12);
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: chatHistory,
        temperature: 0.7
      })
    });

    const data = await response.json();
    let aiReply = data.choices?.[0]?.message?.content || "";

    // Respuestas para "quién eres"/presentación
    if (
      !aiReply ||
      aiReply.toLowerCase().includes("no se pudo") ||
      aiReply.toLowerCase().includes("no encontré una respuesta")
    ) {
      if (
        /kien eres|quien eres|kien es mira|quien es mira|k eres|q eres|qué eres|ke eres|q puedes aser|qué puedes hacer|q asés|qué haces|qué asés|ke funcion tienes|qué funcion tienes|de donde vienes|de donde bvienes|presentate|preséntate|que puedes hacer|quien eres tu|quien sos|quien sos vos|quien soy|quien estoy|quien/.test(userMessage.toLowerCase())
      ) {
        aiReply = "Soy MIRA, una asistente virtual creada por Innova Space y OpenAI. Estoy diseñada para ayudarte a aprender y resolver tus dudas de manera clara, amigable y personalizada, en todas las materias escolares. Puedes preguntarme sobre matemáticas, ciencias, historia, tecnología y mucho más.";
      } else {
        // Wikipedia fallback
        const wiki = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(userMessage)}`);
        const wikiData = await wiki.json();
        aiReply = wikiData.extract || "Lo siento, no encontré una respuesta adecuada.";
      }
    }

    chatHistory.push({ role: "assistant", content: aiReply });

    document.getElementById("thinking")?.remove();
    const html = renderMarkdown(aiReply);
    chatBox.innerHTML += `
      <div>
        <strong>MIRA:</strong>
        <span class="chat-markdown">${html}</span>
      </div>
    `;
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

setAvatarTalking(false);
