// chat.js actualizado para MIRA

let currentChatId = Date.now();
let chats = {};
let isMuted = false;
let lastActivity = Date.now();
const chatBox = document.getElementById("chatBox");
const chatList = document.getElementById("chatList");
const userInput = document.getElementById("userInput");
const avatar = document.getElementById("avatar");

// Iniciar
loadChat(currentChatId);
addChatToList(currentChatId);

function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage("Tú", text);
  userInput.value = "";
  simulateMiraResponse(text);
  lastActivity = Date.now();
}

function handleKey(event) {
  if (event.key === "Enter") sendMessage();
}

function addMessage(sender, text) {
  const bubble = document.createElement("div");
  bubble.className = sender === "Tú" ? "mb-2 text-left" : "mb-4 text-left";
  bubble.innerHTML = `<strong>${sender}:</strong><br>${marked.parse(text)}`;
  chatBox.appendChild(bubble);
  MathJax.typeset();
  chatBox.scrollTop = chatBox.scrollHeight;
  speakIfNeeded(sender, text);
  saveMessage(sender, text);
}

function speakIfNeeded(sender, text) {
  if (sender !== "MIRA" || isMuted) return;
  const cleanText = text.replace(/\$\$(.*?)\$\$/g, "").replace(/`.*?`/g, "");
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = "es-ES";
  speechSynthesis.speak(utterance);
  animateAvatar();
}

function simulateMiraResponse(userText) {
  const response = generateResponse(userText);
  setTimeout(() => {
    addMessage("MIRA", response);
    addSuggestions();
  }, 500);
}

function generateResponse(input) {
  if (input.toLowerCase().includes("velocidad media")) {
    return `**\uD83D\uDCC8 Velocidad Media**\n\nLa fórmula para calcular la velocidad media es:\n\n$$Vm = \frac{\Delta x}{\Delta t}$$\n\n**Donde:**\n- $\n\Delta x$ es la distancia recorrida.\n- $\n\Delta t$ es el tiempo.\n\n**Ejemplo:**\nSi recorres 200 km en 4 h, entonces:\n\n$$Vm = \frac{200}{4} = 50 \text{ km/h}$$`;
  }
  return `Gracias por tu mensaje. ¿Quieres que profundice en este tema o ver un ejemplo?`;
}

function addSuggestions() {
  const sug = document.createElement("div");
  sug.innerHTML = `
  <p class="text-sm mt-2 italic text-purple-300">\uD83D\uDCA1 Sugerencias: 
    <a href="#" onclick="userInput.value='Dame un resumen';sendMessage()">Resumen</a> |
    <a href="#" onclick="userInput.value='Dame un ejemplo';sendMessage()">Ejemplo</a> |
    <a href="#" onclick="userInput.value='Avanza con este tema';sendMessage()">Avanzar</a>
  </p>`;
  chatBox.appendChild(sug);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function toggleMute() {
  isMuted = !isMuted;
  document.getElementById("muteBtn").textContent = isMuted ? "🔇" : "🔊";
}

function newChat() {
  const now = Date.now();
  chats[currentChatId] = chatBox.innerHTML;
  currentChatId = now;
  loadChat(currentChatId);
  addChatToList(currentChatId);
}

function saveMessage(sender, text) {
  if (!chats[currentChatId]) chats[currentChatId] = "";
  chats[currentChatId] += `<div><strong>${sender}:</strong><br>${marked.parse(text)}</div>`;
}

function loadChat(id) {
  chatBox.innerHTML = chats[id] || "";
}

function addChatToList(id) {
  const btn = document.createElement("button");
  btn.className = "block mt-1 text-left text-sm text-white hover:underline";
  btn.textContent = `Chat ${id}`;
  btn.onclick = () => {
    chats[currentChatId] = chatBox.innerHTML;
    currentChatId = id;
    loadChat(id);
  };
  chatList.appendChild(btn);
}

function animateAvatar() {
  avatar.style.transform = "scale(1.1) rotate(2deg)";
  setTimeout(() => avatar.style.transform = "scale(1) rotate(0deg)", 500);
}

// Avatar movible
avatar.onmousedown = function (e) {
  e.preventDefault();
  let shiftX = e.clientX - avatar.getBoundingClientRect().left;
  let shiftY = e.clientY - avatar.getBoundingClientRect().top;

  function moveAt(pageX, pageY) {
    avatar.style.left = pageX - shiftX + 'px';
    avatar.style.top = pageY - shiftY + 'px';
    avatar.style.position = 'fixed';
  }

  function onMouseMove(e) {
    moveAt(e.pageX, e.pageY);
  }

  document.addEventListener('mousemove', onMouseMove);
  avatar.onmouseup = function () {
    document.removeEventListener('mousemove', onMouseMove);
    avatar.onmouseup = null;
  };
};
