// === Configuración inicial ===
const API_KEY = "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";
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const SYSTEM_PROMPT = `
Eres MIRA, una asistente virtual creada por Innova Space y OpenAI. 

- Si te piden una **fórmula, ecuación o función**, primero explica brevemente su significado con palabras simples y luego escríbela usando LaTeX, pero no aclares que es LaTeX ni uses signos de dólar en la explicación.
- Usa explicaciones claras y amigables antes de mostrar cualquier fórmula.
- Ejemplo:  
La velocidad media es la variación de la posición dividido por la variación del tiempo.  
La fórmula es:
$$
v_m = \\frac{\\Delta x}{\\Delta t}
$$
Donde:  
v_m es la velocidad media  
Δx es el cambio en la posición  
Δt es el cambio en el tiempo

- Responde siempre en español.
- Mantén el contexto de la conversación anterior si el usuario hace referencia al mismo tema.
- No expliques el código LaTeX, solo úsalo para que la fórmula se vea bonita.
`;

// === Estado ===
let currentChatId = null;
let isMuted = false;

// ==== ELEMENTOS ====
const chatList = document.getElementById("chat-list");
const responseBox = document.getElementById("response-box");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const muteBtn = document.getElementById("mute-btn");

// ============ FUNCIONES LOCALSTORAGE (CHATS) ===============
function getAllChats() {
  return JSON.parse(localStorage.getItem("mira_chats") || "{}");
}
function saveAllChats(chats) {
  localStorage.setItem("mira_chats", JSON.stringify(chats));
}
function getChat(id) {
  return getAllChats()[id] || {title:"Chat 1", history:[]};
}
function saveChat(id, chat) {
  const chats = getAllChats();
  chats[id] = chat;
  saveAllChats(chats);
}
function deleteChat(id) {
  const chats = getAllChats();
  delete chats[id];
  saveAllChats(chats);
}
function generateChatId() {
  return "chat" + Date.now();
}
function listChats() {
  chatList.innerHTML = "";
  const chats = getAllChats();
  const keys = Object.keys(chats);
  if (keys.length === 0) {
    // Crear chat por defecto si no hay ninguno
    const id = generateChatId();
    saveChat(id, {title: "Chat 1", history: []});
    keys.push(id);
  }
  keys.forEach(id => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = chats[id].title || "Chat";
    a.onclick = (e) => { e.preventDefault(); openChat(id); };
    li.appendChild(a);
    chatList.appendChild(li);
  });
}
function newChat() {
  const id = generateChatId();
  saveChat(id, {title: "Chat " + (Object.keys(getAllChats()).length+1), history: []});
  openChat(id);
  listChats();
}
function openChat(id) {
  currentChatId = id;
  const chat = getChat(id);
  renderHistory(chat.history);
}
function appendMessage(role, content) {
  const chat = getChat(currentChatId);
  chat.history = chat.history || [];
  chat.history.push({role, content});
  saveChat(currentChatId, chat);
}
function renderHistory(history) {
  responseBox.innerHTML = "";
  history.forEach(msg => {
    if (msg.role === "user") {
      responseBox.innerHTML += `<div style="color:#ffe46b;margin-bottom:0.5em;"><strong>Tú:</strong> ${escapeHtml(msg.content)}</div>`;
    } else if (msg.role === "assistant") {
      const html = renderMarkdown(msg.content);
      responseBox.innerHTML += `<div style="margin-bottom:1.2em;"><strong>MIRA:</strong> <span class="chat-markdown">${html}</span></div>`;
    }
  });
  if (window.MathJax) MathJax.typesetPromise();
  responseBox.scrollTop = responseBox.scrollHeight;
}

// ========== MARKDOWN + LaTeX RENDER =========
function renderMarkdown(text) {
  return marked.parse(text || "");
}
function escapeHtml(text) {
  return (text || "").replace(/[&<>"']/g, m =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])
  );
}

// ========== VOZ: solo lee texto plano y no LaTeX ==========
function plainTextForVoice(md) {
  // Quitar LaTeX $$...$$ y $...$
  let txt = md.replace(/\$\$[\s\S]*?\$\$/g, " ");
  txt = txt.replace(/\$[^$]*\$/g, " ");
  // Quitar negritas/cursivas Markdown
  txt = txt.replace(/\*\*([^*]+)\*\*/g, '$1')
           .replace(/\*([^*]+)\*/g, '$1')
           .replace(/__([^_]+)__/g, '$1')
           .replace(/_([^_]+)_/g, '$1');
  txt = txt.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  return txt;
}
function speak(text) {
  if (isMuted) return;
  try {
    const plain = plainTextForVoice(text);
    if (!plain) return;
    const msg = new SpeechSynthesisUtterance(plain);
    msg.lang = "es-ES";
    msg.rate = 1;
    window.speechSynthesis.cancel();
    setAvatarTalking(true);
    msg.onend = () => setAvatarTalking(false);
    msg.onerror = () => setAvatarTalking(false);
    window.speechSynthesis.speak(msg);
  } catch { setAvatarTalking(false);}
}
// ========== AVATAR ANIMADO ===========
function setAvatarTalking(talking) {
  const avatar = document.getElementById("avatar-mira");
  if (talking) avatar.classList.add("pulse");
  else avatar.classList.remove("pulse");
}

// ========== ENVIAR MENSAJE ===========
async function sendMessage() {
  const userMessage = input.value.trim();
  if (!userMessage) return;
  appendMessage("user", userMessage);
  input.value = "";
  renderHistory(getChat(currentChatId).history);

  // Indicador de pensando...
  responseBox.innerHTML += `<div id="thinking" style="color:#c1afff;margin:1em 0;font-style:italic;"><span class="animate-pulse">MIRA está pensando...</span></div>`;
  responseBox.scrollTop = responseBox.scrollHeight;

  try {
    // Envía solo últimos 10 turnos (para contexto)
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...getChat(currentChatId).history.slice(-10).map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      })),
      { role: "user", content: userMessage }
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    document.getElementById("thinking")?.remove();
    let aiReply = data.choices?.[0]?.message?.content || "";

    // Si no responde, busca Wikipedia
    if (!aiReply || aiReply.toLowerCase().includes("no encontré")) {
      const wiki = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(userMessage)}`);
      const wikiData = await wiki.json();
      aiReply = wikiData.extract || "Lo siento, no encontré una respuesta adecuada.";
    }

    appendMessage("assistant", aiReply);
    renderHistory(getChat(currentChatId).history);

    // Voz solo de la respuesta nueva
    speak(aiReply);

  } catch (err) {
    document.getElementById("thinking")?.remove();
    appendMessage("assistant", "Ocurrió un error al conectar con la IA.");
    renderHistory(getChat(currentChatId).history);
    setAvatarTalking(false);
    console.error(err);
  }
}

// ========== EVENTOS ===========
sendBtn.onclick = sendMessage;
input.addEventListener("keydown", function(event) {
  if (event.key === "Enter") { event.preventDefault(); sendMessage(); }
});

// ==== BOTÓN DE VOLUMEN ====
muteBtn.onclick = () => {
  isMuted = !isMuted;
  muteBtn.classList.toggle("muted", isMuted);
  muteBtn.innerHTML = isMuted
    ? `<svg height="24" width="24" viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03zm2.5 0c0 3.31-2.69 6-6 6v2c4.42 0 8-3.58 8-8h-2z"></path><line x1="4" y1="4" x2="20" y2="20" stroke="red" stroke-width="2"/></svg>`
    : `<svg height="24" width="24" viewBox="0 0 24 24"><path d="M3 10v4h4l5 5V5l-5 5H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03zm2.5 0c0 3.31-2.69 6-6 6v2c4.42 0 8-3.58 8-8h-2z"></path></svg>`;
};

// ========== INICIO ===========
(function init(){
  // Carga chats y abre el primero
  listChats();
  const keys = Object.keys(getAllChats());
  if (keys.length === 0) newChat();
  else openChat(keys[0]);

  // Voz desmuteada
  isMuted = false;
  muteBtn.classList.remove("muted");

  // Avatar inicia quieto
  setAvatarTalking(false);
})();
