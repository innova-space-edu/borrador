let chats = JSON.parse(localStorage.getItem('chats')) || {};
let currentChatId = null;
let muted = false;

// Elementos
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const chatList = document.getElementById('chat-list');
const toggleSidebar = document.getElementById('toggle-sidebar');
const sidebar = document.getElementById('sidebar');
const newChatBtn = document.getElementById('new-chat');
const avatar = document.getElementById('mira-avatar');
const muteButton = document.getElementById('mute-button');

// Drag para el avatar
avatar.addEventListener('mousedown', function (e) {
    avatar.style.position = 'fixed';
    function moveAt(x, y) {
        avatar.style.left = x - avatar.offsetWidth / 2 + 'px';
        avatar.style.top = y - avatar.offsetHeight / 2 + 'px';
    }
    moveAt(e.clientX, e.clientY);
    function onMouseMove(e) {
        moveAt(e.clientX, e.clientY);
    }
    document.addEventListener('mousemove', onMouseMove);
    avatar.onmouseup = function () {
        document.removeEventListener('mousemove', onMouseMove);
        avatar.onmouseup = null;
    };
});

// Alternar volumen
muteButton.addEventListener('click', () => {
    muted = !muted;
    muteButton.innerHTML = muted ? '🔈' : '🔊';
});

// Alternar menú
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// Enviar mensaje
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Crear nuevo chat
newChatBtn.addEventListener('click', () => {
    currentChatId = Date.now().toString();
    chats[currentChatId] = [];
    localStorage.setItem('chats', JSON.stringify(chats));
    renderChatList();
    renderChat();
});

// Cargar chats
function renderChatList() {
    chatList.innerHTML = '';
    Object.keys(chats).forEach((chatId) => {
        const li = document.createElement('li');
        li.textContent = `Chat ${chatId}`;
        li.onclick = () => {
            currentChatId = chatId;
            renderChat();
        };
        chatList.appendChild(li);
    });
}

// Mostrar conversación
function renderChat() {
    chatContainer.innerHTML = '';
    if (!currentChatId) return;
    chats[currentChatId].forEach((msg) => {
        const div = document.createElement('div');
        div.className = msg.sender;
        div.innerHTML = `<strong>${msg.sender === 'user' ? 'Tú' : 'MIRA'}:</strong> ${msg.text}`;
        chatContainer.appendChild(div);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
    MathJax.typeset(); // Renderiza LaTeX
}

// Enviar mensaje y responder
function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;
    const message = { sender: 'user', text };
    chats[currentChatId].push(message);
    userInput.value = '';
    renderChat();

    // Simulación de respuesta
    setTimeout(() => {
        const reply = generarRespuesta(text);
        chats[currentChatId].push({ sender: 'MIRA', text: reply });
        localStorage.setItem('chats', JSON.stringify(chats));
        renderChat();
        speak(reply);
        sugerenciasExtras();
    }, 800);
}

// Respuesta simulada
function generarRespuesta(input) {
    if (input.toLowerCase().includes("velocidad media")) {
        return `
        \\[
        \\text{Velocidad Media (Vm)} = \\frac{\\text{Distancia}}{\\text{Tiempo}}
        \\]
        Por ejemplo, si recorres 100 km en 2 horas: \\( Vm = \\frac{100}{2} = 50 \\text{ km/h} \\)
        `;
    }
    return `¡Gracias por tu pregunta! 😊 Estoy buscando la mejor manera de ayudarte. ¿Quieres que te dé un ejemplo o que avancemos con otro tema?`;
}

// Texto a voz
function speak(text) {
    if (muted) return;
    const utterance = new SpeechSynthesisUtterance();
    const clean = text.replace(/\$\$.*?\$\$|\\\[.*?\\\]|\\\(.*?\\\)/g, ''); // evita leer LaTeX
    utterance.text = clean;
    utterance.lang = 'es-ES';
    speechSynthesis.speak(utterance);
}

// Sugerencias de seguimiento
function sugerenciasExtras() {
    const div = document.createElement('div');
    div.className = 'mira';
    div.innerHTML = `
        <em><b>Sugerencias:</b></em>
        <a href="#" onclick="insertSugerencia('¿Puedes darme un ejemplo concreto?')">Ejemplo</a> |
        <a href="#" onclick="insertSugerencia('¿Qué sigue después de esto?')">Avanzar</a> |
        <a href="#" onclick="insertSugerencia('Explícalo como si tuviera 10 años')">Simplificar</a>
    `;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Insertar sugerencia como texto
function insertSugerencia(text) {
    userInput.value = text;
    sendMessage();
}

// Inicializar
if (Object.keys(chats).length === 0) {
    newChatBtn.click();
} else {
    currentChatId = Object.keys(chats)[0];
    renderChatList();
    renderChat();
}
