const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const SYSTEM_PROMPT = `
Eres MIRA, una asistente virtual educativa creada por Innova Space y OpenAI.

Responde siempre de forma clara, natural y ordenada, como ChatGPT. Utiliza títulos, listas, tablas y explicaciones sencillas.

Cuando te pidan una fórmula, ecuación o función:
- Explica primero con una frase sencilla y clara lo que representa esa fórmula.
- Después, muestra la fórmula escrita en LaTeX para que se vea ordenada y bonita.

Al explicar el significado de cada variable, escribe el nombre y su significado en texto simple, así el usuario lo puede leer y escuchar fácilmente (ejemplo: v_m es la velocidad media).

Haz las explicaciones lo más comprensibles y didácticas posible, como para estudiantes de secundaria.
Corrige errores ortográficos automáticamente. Si la pregunta es ambigua, interpreta o pide aclaración.
Mantén el hilo de la conversación y responde a preguntas de seguimiento (“otro ejemplo”, “explícalo de nuevo”, etc.) teniendo en cuenta el contexto anterior.

Responde siempre en español, a menos que el usuario indique otro idioma.
`;

function setAvatarTalking(isTalking) {
  const avatar = document.getElementById("avatar-mira");
  if (!avatar) return;
  avatar.classList.toggle("pulse", isTalking);
}

document.getElementById("user-input").addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
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

function plainTextForVoice(markdown) {
  let text = markdown
    .split('\n')
    .filter(line =>
      !line.trim().startsWith('$$') &&
      !line.trim().endsWith('$$') &&
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

  return text.replace(/\.{2,}/g, '.').replace(/\. \./g, '. ');
}

function speak(text) {
  try {
    const plain = plainTextForVoice(text);
    if (!plain) return;
    const msg = new SpeechSynthesisUtterance(plain);
    msg.lang = "es-ES";
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
  return text.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

const chatHistory = [
  { role: "system", content: SYSTEM_PROMPT }
];

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
  if (chatHistory.length > 9) chatHistory.splice(1, chatHistory.length - 8);

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

    if (!aiReply || aiReply.toLowerCase().includes("no se pudo") || aiReply.toLowerCase().includes("no encontré")) {
      if (/quien eres|qué puedes hacer|presentate/.test(userMessage.toLowerCase())) {
        aiReply = "Soy MIRA, una asistente virtual creada por Innova Space y OpenAI. Estoy diseñada para ayudarte a aprender y resolver tus dudas de manera clara, amigable y personalizada.";
      } else {
        const wiki = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(userMessage)}`);
        const wikiData = await wiki.json();
        aiReply = wikiData.extract || "Lo siento, no encontré una respuesta adecuada.";
      }
    }

    chatHistory.push({ role: "assistant", content: aiReply });
    document.getElementById("thinking")?.remove();
    const html = renderMarkdown(aiReply);
    chatBox.innerHTML += `<div><strong>MIRA:</strong><span class="chat-markdown">${html}</span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
    speak(aiReply);
    if (window.MathJax) MathJax.typesetPromise();

  } catch (error) {
    console.error(error);
    document.getElementById("thinking")?.remove();
    chatBox.innerHTML += `<div><strong>MIRA:</strong> Error al conectar con la IA.</div>`;
    setAvatarTalking(false);
  }
}

setAvatarTalking(false);

// 📸 Análisis de imagen (OCR + BLIP-2 visual)
async function analyzeImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  const chatBox = document.getElementById("chat-box");
  const reader = new FileReader();

  reader.onload = async function () {
    const base64 = reader.result.split(",")[1];

    chatBox.innerHTML += `
      <div><strong>Tú:</strong><br>
        <img src="${reader.result}" alt="Imagen subida" class="mt-2 mb-2 max-w-xs rounded-lg shadow-md border border-purple-500">
      </div>
    `;
    chatBox.scrollTop = chatBox.scrollHeight;

    chatBox.innerHTML += `<div id="thinking" class="text-purple-300 italic">MIRA está analizando la imagen...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
      const ocrRes = await fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: {
          apikey: "K82378316388957",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: `base64Image=data:image/jpeg;base64,${base64}&language=spa`
      });

      const ocrData = await ocrRes.json();
      const ocrText = ocrData?.ParsedResults?.[0]?.ParsedText || "";

      if (ocrText.trim().length >= 30) {
        document.getElementById("thinking")?.remove();
        chatBox.innerHTML += `<div><strong>MIRA:</strong> Detecté texto en la imagen:<br><em class="text-purple-200">${ocrText}</em></div>`;
        document.getElementById("user-input").value = `Analiza este contenido extraído de una imagen: ${ocrText}`;
        sendMessage();
        return;
      }

      chatBox.innerHTML += `<div class="text-purple-300">No detecté texto. Intentando analizar visualmente...</div>`;

      const hfVision = await fetch("https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base", {
        method: "POST",
        headers: {
          Authorization: "Bearer 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",
          "Content-Type": "application/octet-stream"
        },
        body: file
      });

      const result = await hfVision.json();
      const caption = result?.[0]?.generated_text || "No pude interpretar visualmente la imagen.";

      document.getElementById("thinking")?.remove();
      chatBox.innerHTML += `<div><strong>MIRA:</strong> Esto es lo que veo en la imagen:<br><em class="text-purple-200">${caption}</em></div>`;
      document.getElementById("user-input").value = `Analiza esta descripción generada visualmente: ${caption}`;
      sendMessage();

    } catch (error) {
      console.error("Error al analizar imagen:", error);
      document.getElementById("thinking")?.remove();
      chatBox.innerHTML += `<div><strong>MIRA:</strong> No pude analizar la imagen.</div>`;
    }
  };

  reader.readAsDataURL(file);
}
