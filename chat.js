const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `
Eres MIRA, una asistente virtual educativa creada por Innova Space y OpenAI.
Responde de forma clara, ordenada y didáctica para estudiantes de educación escolar.
Corrige errores ortográficos y explica con ejemplos siempre que sea posible.
Usa Markdown y LaTeX para fórmulas si es necesario, pero habla siempre en español.
`;

const chatHistory = [{ role: "system", content: SYSTEM_PROMPT }];

function setAvatarTalking(isTalking) {
  const avatar = document.getElementById("avatar-mira");
  if (!avatar) return;
  if (isTalking) {
    avatar.classList.add("pulse");
  } else {
    avatar.classList.remove("pulse");
  }
}

function speak(text) {
  try {
    const plain = text.replace(/(<([^>]+)>)/gi, ""); // quitar HTML
    const msg = new SpeechSynthesisUtterance(plain);
    msg.lang = "es-ES";
    window.speechSynthesis.cancel();
    setAvatarTalking(true);
    msg.onend = () => setAvatarTalking(false);
    window.speechSynthesis.speak(msg);
  } catch (err) {
    console.error("Error al hablar:", err);
    setAvatarTalking(false);
  }
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

function renderMarkdown(text) {
  return marked.parse(text);
}

function showThinking() {
  const chatBox = document.getElementById("chat-box");
  const thinking = document.createElement("div");
  thinking.id = "thinking";
  thinking.className = "text-purple-300 italic";
  thinking.innerHTML = `<span class="animate-pulse">MIRA está pensando<span class="animate-bounce">...</span></span>`;
  chatBox.appendChild(thinking);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");
  const userMessage = input.value.trim();
  if (!userMessage) return;

  chatBox.innerHTML += `<div><strong>Tú:</strong> ${escapeHtml(userMessage)}</div>`;
  input.value = "";
  showThinking();

  chatHistory.push({ role: "user", content: userMessage });

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    const data = await res.json();
    let aiReply = data.choices?.[0]?.message?.content || "Lo siento, no encontré una respuesta.";

    chatHistory.push({ role: "assistant", content: aiReply });

    document.getElementById("thinking")?.remove();
    const html = renderMarkdown(aiReply);
    chatBox.innerHTML += `<div><strong>MIRA:</strong><span class="chat-markdown">${html}</span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    speak(aiReply);
    if (window.MathJax) MathJax.typesetPromise();

  } catch (error) {
    document.getElementById("thinking")?.remove();
    chatBox.innerHTML += `<div><strong>MIRA:</strong> Error al conectar con la IA.</div>`;
    console.error("Error al conectar:", error);
  }
}

// Activar botón y Enter
document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("user-input").addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

// Función para analizar imagen (OCR o BLIP)
async function analyzeImage(mode) {
  const file = document.getElementById("image-input").files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64Image = reader.result.split(',')[1];
    const url = mode === "ocr"
      ? "https://api.ocr.space/parse/image"
      : "http://localhost:3001/api/blip";

    const headers = mode === "ocr"
      ? { apikey: "K82378316388957", "Content-Type": "application/x-www-form-urlencoded" }
      : { "Content-Type": "application/json" };

    const body = mode === "ocr"
      ? new URLSearchParams({ base64Image: `data:image/png;base64,${base64Image}` }).toString()
      : JSON.stringify({ inputs: `data:image/png;base64,${base64Image}` });

    try {
      const res = await fetch(url, { method: "POST", headers, body });
      const result = await res.json();

      const text = mode === "ocr"
        ? result.ParsedResults?.[0]?.ParsedText || "No se pudo leer texto."
        : result?.generated_text || "No se pudo generar descripción.";

      const chatBox = document.getElementById("chat-box");
      const div = document.createElement("div");
      div.innerHTML = `
        <div class="bg-purple-800 text-white p-4 rounded-xl shadow-lg max-w-2xl mx-auto">
          <strong>🖼️ MIRA (imagen):</strong><br>${text}
        </div>`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
      speak(text);
    } catch (e) {
      console.error("Error al analizar imagen:", e);
    }
  };
  reader.readAsDataURL(file);
}
