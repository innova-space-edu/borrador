const chatContainer = document.getElementById("chat-container");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const avatar = document.getElementById("avatar");
const typing = document.getElementById("typing-indicator");
const API_KEY = "TU_API_KEY_GROQ";
let chatHistory = JSON.parse(localStorage.getItem("miraChat") || "[]");

// === RENDER INICIAL ===
window.addEventListener("DOMContentLoaded", () => {
  chatHistory.forEach(msg => renderMessage(msg.role, msg.content));
});

// === FUNCIONES BASE ===
function renderMessage(role, content) {
  const msg = document.createElement("div");
  msg.className = `message ${role === "user" ? "user" : "bot"}`;
  msg.innerHTML = marked.parse(content);
  chatContainer.appendChild(msg);
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
  MathJax.typesetPromise();
  if (role === "assistant") {
    speak(content);
    avatar.classList.add("talking");
    setTimeout(() => avatar.classList.remove("talking"), 1200);
  }
}

function saveChat(role, content) {
  chatHistory.push({ role, content });
  localStorage.setItem("miraChat", JSON.stringify(chatHistory));
}

function speak(text) {
  const cleaned = text.replace(/\$\$.*?\$\$/gs, "").replace(/\$.*?\$/g, "");
  const msg = new SpeechSynthesisUtterance(cleaned);
  msg.lang = "es-ES";
  speechSynthesis.cancel();
  speechSynthesis.speak(msg);
}

// === ENVÍO Y RESPUESTA ===
sendBtn.onclick = () => handleSend();
input.addEventListener("keydown", e => {
  if (e.key === "Enter") handleSend();
});

function handleSend() {
  const question = input.value.trim();
  if (!question) return;
  renderMessage("user", question);
  saveChat("user", question);
  input.value = "";
  getResponse(question);
}

async function getResponse(prompt) {
  typing.textContent = "MIRA está escribiendo...";
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer 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",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: "Eres MIRA, una IA educativa amable y clara." },
          ...chatHistory.slice(-10),
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "Lo siento, no entendí.";
    renderMessage("assistant", content);
    saveChat("assistant", content);
  } catch (e) {
    renderMessage("assistant", "Error al conectar con la IA.");
  } finally {
    typing.textContent = "";
  }
}

// === MOVER AVATAR ===
avatar.addEventListener("mousedown", startDrag);
function startDrag(e) {
  const offsetX = e.clientX - avatar.offsetLeft;
  const offsetY = e.clientY - avatar.offsetTop;
  function drag(e) {
    avatar.style.left = `${e.clientX - offsetX}px`;
    avatar.style.top = `${e.clientY - offsetY}px`;
  }
  function stopDrag() {
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);
  }
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", stopDrag);
}
