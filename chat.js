
const avatar = document.getElementById("avatar-mira");

function hablar(texto) {
  const voz = new SpeechSynthesisUtterance(texto);
  voz.lang = "es-ES";
  voz.pitch = 1.1;
  voz.rate = 1;
  voz.volume = 1;
  voz.onstart = () => avatar.classList.add("pulse");
  voz.onend = () => avatar.classList.remove("pulse");
  speechSynthesis.speak(voz);
}

function sendMessage() {
  const input = document.getElementById("user-input");
  const mensaje = input.value.trim();
  if (!mensaje) return;

  const chat = document.getElementById("chat-box");
  const userMsg = document.createElement("div");
  userMsg.innerHTML = "<strong>Tú:</strong> " + mensaje;
  chat.appendChild(userMsg);
  input.value = "";

  setTimeout(() => {
    const respuesta = generarRespuestaIA(mensaje);
    const miraMsg = document.createElement("div");
    miraMsg.innerHTML = "<strong>MIRA:</strong> " + respuesta;
    chat.appendChild(miraMsg);
    chat.scrollTop = chat.scrollHeight;
    hablar(respuesta);
  }, 500);
}

function generarRespuestaIA(pregunta) {
  return "Estoy pensando en tu pregunta sobre \"" + pregunta + "\". Esta es una respuesta de ejemplo.";
}
