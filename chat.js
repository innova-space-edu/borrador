const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `
Eres MIRA, una asistente virtual educativa creada por Innova Space y OpenAI.
Explica siempre de forma clara, natural y ordenada, como ChatGPT. Utiliza títulos, listas, tablas y explicaciones sencillas.
Cuando presentes una fórmula, ecuación o función:
- Explica primero con una frase sencilla y clara lo que representa esa fórmula.
- Luego muestra la fórmula en LaTeX (usa $$).
- Después, explica el significado de cada variable en texto simple, así el usuario lo puede leer y escuchar fácilmente (ejemplo: v_m es la velocidad media).
Incluye ejemplos cuando sea útil. Corrige errores ortográficos automáticamente. Si la pregunta es ambigua, interpreta o pide aclaración. Mantén el hilo de la conversación y responde a preguntas de seguimiento considerando el contexto anterior. Responde siempre en español, salvo que el usuario pida otro idioma.
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
    const plain = text.replace(/(<([^>]+)>)/gi, "");
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

// === Mejoras: Interpretación visual para imágenes ===
function interpretarDescripcion(desc, mode) {
  desc = desc.trim();
  if (mode === "ocr") {
    if (desc.length < 10) return "No se encontró texto relevante en la imagen. ¿Quieres probar con otra?";
    if (desc.match(/herramientas?|archivos?|agregar/i)) return "La imagen parece mostrar opciones para agregar archivos o herramientas.";
    if (desc.match(/matemáticas?|ejercicio|problema|números?|operación/i)) return "La imagen contiene ejercicios o problemas matemáticos. ¿Quieres que resuelva alguno?";
    return `Texto extraído: ${desc}`;
  }
  if (desc.match(/screenshot|captura/i)) return "La imagen parece ser una captura de pantalla. ¿Quieres que explique lo que se ve?";
  if (desc.match(/list|lista|option|opción|herramienta|tool/i)) return "La imagen parece mostrar una lista de herramientas u opciones.";
  if (desc.match(/math|formula|ecuación|number|número/i)) return "Veo operaciones matemáticas o fórmulas. ¿Te gustaría que resuelva algún ejercicio?";
  if (desc.length < 5) return "No pude identificar la imagen. Puedes intentar con otra más clara.";
  return desc;
}

// ==== Función para analizar imagen (OCR o BLIP seguro) ====
async function analyzeImage(mode) {
  const file = document.getElementById("image-input").files[0];
  if (!file) return;

  const chatBox = document.getElementById("chat-box");
  showThinking();

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
        : result?.generated_text || result?.[0]?.generated_text || "No se pudo generar descripción.";

      document.getElementById("thinking")?.remove();

      // Interpretar y sugerir
      const sugerencia = interpretarDescripcion(text, mode);
      const div = document.createElement("div");
      div.innerHTML = `
        <div class="bg-purple-800 text-white p-4 rounded-xl shadow-lg max-w-2xl mx-auto">
          <strong>🖼️ MIRA (imagen):</strong><br>${sugerencia}
        </div>`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
      speak(sugerencia);

    } catch (e) {
      document.getElementById("thinking")?.remove();
      chatBox.innerHTML += `<div class="text-red-400">Error al analizar imagen: ${e.message || e}</div>`;
      console.error("Error al analizar imagen:", e);
    }
  };
  reader.readAsDataURL(file);
}
