const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// Config de voz global
let isMuted = false;
let voiceVolume = 1.0;

// Historial en memoria
let chatHistory = [
  { role: "system", content: `
Eres MIRA, una asistente virtual creada por Innova Space y OpenAI. Responde en español y ayuda a estudiantes de todas las edades.
Si el usuario pide una fórmula, ecuación o función, primero **explica brevemente con palabras simples**, y luego escribe la fórmula en LaTeX (entre signos de dólar, para que se vea bien renderizado).
**Ejemplo**: 
"La velocidad media es la variación de la posición dividido por la variación del tiempo. 
La fórmula es:
$$v_m = \\frac{\\Delta x}{\\Delta t}$$"

No incluyas código LaTeX ni signos de dólar en las explicaciones escritas, solo en la ecuación.
Después de la fórmula, explica cada variable y su significado usando solo palabras (sin signos $).

Corrige y responde aunque el usuario escriba con errores, palabras incompletas o frases poco claras.

Intenta mantener el hilo de la conversación, responde ejemplos, explicaciones y nuevos cálculos si el usuario los pide.

No te disculpes, ni avises de limitaciones, responde siempre lo mejor posible.

Sé cercano, visual y claro.
` }
];

// ----------- AVATAR ANIMACIÓN -----------------
function setAvatarTalking(isTalking) {
  const avatar = document.getElementById("avatar-mira");
  if (!avatar) return;
  if (isTalking) {
    avatar.classList.add("pulse");
  } else {
    avatar.classList.remove("pulse");
  }
}

// ----------- TEXTO A VOZ -----------------
function plainTextForVoice(markdown) {
  // Elimina LaTeX ($...$ y $$...$$)
  let text = markdown.replace(/\$\$[\s\S]*?\$\$/g, ' ');
  text = text.replace(/\$[^$]*\$/g, ' ');
  // Quita markdown (**negrita** etc)
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');
  // Quita viñetas y símbolos de listas
  text = text.replace(/^\s*[\-\•]\s*/gm, '');
  // Añade pausas en puntos y comas (voz más natural)
  text = text.replace(/([.,:;!?])/g, '$1 <break time="400ms"/>');
  // Quita saltos dobles (los convertimos en pausa más larga)
  text = text.replace(/\n{2,}/g, ' <break time="650ms"/> ');
  // Quita saltos simples (pausa corta)
  text = text.replace(/\n/g, ' <break time="380ms"/> ');
  // Espacios de más
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

function speak(text) {
  if (isMuted) return;
  try {
    const plain = plainTextForVoice(text);
    if (!plain) return;
    const msg = new SpeechSynthesisUtterance(plain.replace(/<break time="(\d+)ms"\/>/g, "")); // Para que hable, pero puedes cambiar a usar SSML si implementas Speech API avanzada.
    msg.lang = "es-ES";
    msg.volume = voiceVolume;
    setAvatarTalking(true);
    msg.onend = () => setAvatarTalking(false);
    msg.onerror = () => setAvatarTalking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(msg);
  } catch {
    setAvatarTalking(false);
  }
}

// -------------- RENDER MARKDOWN -----------------
function renderMarkdown(text) {
  return marked.parse(text);
}

// ------------- VOLUMEN y MUTE -------------------
const volumeSlider = document.getElementById('volume-slider');
const muteBtn = document.getElementById('mute-btn');
const muteIcon = document.getElementById('mute-icon');

volumeSlider.addEventListener('input', function () {
  voiceVolume = parseInt(volumeSlider.value, 10) / 100;
  if (voiceVolume === 0) {
    isMuted = true;
    muteIcon.innerHTML = '🔇';
    muteBtn.title = 'Voz desactivada';
  } else {
    isMuted = false;
    muteIcon.innerHTML = '🔊';
    muteBtn.title = 'Voz activada';
  }
});

muteBtn.addEventListener('click', function () {
  isMuted = !isMuted;
  if (isMuted) {
    muteIcon.innerHTML = '🔇';
    muteBtn.title = 'Voz desactivada';
    volumeSlider.value = 0;
  } else {
    muteIcon.innerHTML = '🔊';
    muteBtn.title = 'Voz activada';
    if (voiceVolume === 0) {
      voiceVolume = 1.0;
      volumeSlider.value = 100;
    }
  }
});

// ------------- ENVIAR MENSAJE ---------------
document.getElementById("user-input").addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    speak("¡Hola! Soy MIRA, tu asistente virtual. ¿En qué puedo ayudarte hoy?");
    setAvatarTalking(false);
  }, 800);
});

function showThinking() {
  const chatBox = document.getElementById("chat-box");
  const thinking = document.createElement("div");
  thinking.id = "thinking";
  thinking.className = "text-purple-300 italic";
  thinking.innerHTML = `<span class="animate-pulse">MIRA está pensando<span class="animate-bounce">...</span></span>`;
  chatBox.appendChild(thinking);
  chatBox.scrollTop = chatBox.scrollHeight;
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

async function sendMessage() {
  const input = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");
  const userMessage = input.value.trim();
  if (!userMessage) return;

  chatBox.innerHTML += `<div><strong>Tú:</strong> ${escapeHtml(userMessage)}</div>`;
  input.value = "";
  showThinking();

  // Añade mensaje al historial (en memoria)
  chatHistory.push({ role: "user", content: userMessage });

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
    document.getElementById("thinking")?.remove();
    let aiReply = data.choices?.[0]?.message?.content || "";

    // Añadir respuesta al historial para mantener contexto conversacional
    chatHistory.push({ role: "assistant", content: aiReply });

    // Renderizar Markdown + MathJax
    const html = renderMarkdown(aiReply);
    chatBox.innerHTML += `<div><strong>MIRA:</strong> <span class="chat-markdown">${html}</span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    // Voz SOLO de lo que se muestra
    speak(aiReply);

    // Re-renderizar MathJax para fórmulas
    if (window.MathJax) MathJax.typesetPromise();

  } catch (error) {
    document.getElementById("thinking")?.remove();
    chatBox.innerHTML += `<div><strong>MIRA:</strong> Error al conectar con la IA.</div>`;
    setAvatarTalking(false);
    console.error(error);
  }
}

// Halo arranca quieto
setAvatarTalking(false);

