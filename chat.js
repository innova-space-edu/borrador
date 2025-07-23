// chat.js - MIRA v2.0 con memoria temporal

const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const avatar = document.getElementById('avatar-mira');

let historialConversacion = [];
let temporizadorMemoria = null;
const tiempoMemoriaMs = 5 * 60 * 1000; // 5 minutos

function mostrarMensaje(origen, texto) {
  const mensaje = document.createElement('div');
  mensaje.innerHTML = `<strong>${origen}:</strong> ${marked.parse(texto)}`;
  chatBox.appendChild(mensaje);
  chatBox.scrollTop = chatBox.scrollHeight;
  if (origen === 'MIRA') hablar(texto);
}

function hablar(texto) {
  const voz = new SpeechSynthesisUtterance(texto);
  voz.lang = 'es-ES';
  voz.pitch = 1.1;
  voz.rate = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(voz);
  avatar.classList.add('pulse');
  voz.onend = () => avatar.classList.remove('pulse');
}

function enviarMensaje() {
  const mensaje = userInput.value.trim();
  if (!mensaje) return;
  mostrarMensaje('Tú', mensaje);
  userInput.value = '';
  historialConversacion.push({ role: 'user', content: mensaje });
  actualizarMemoriaTemporal();

  if (mensaje.toLowerCase().includes('nuevo tema')) {
    historialConversacion = [];
    mostrarMensaje('MIRA', 'Conversación reiniciada. ¿Sobre qué tema quieres hablar ahora?');
    return;
  }

  obtenerRespuesta();
}

function actualizarMemoriaTemporal() {
  clearTimeout(temporizadorMemoria);
  temporizadorMemoria = setTimeout(() => {
    historialConversacion = [];
    mostrarMensaje('MIRA', 'Se ha cerrado el tema anterior por inactividad. ¿Quieres hablar de algo nuevo?');
  }, tiempoMemoriaMs);
}

async function obtenerRespuesta() {
  mostrarMensaje('MIRA', '⏳ Pensando...');
  const respuesta = await llamarAPI(historialConversacion);
  const elementos = chatBox.querySelectorAll('div');
  if (elementos.length > 0 && elementos[elementos.length - 1].textContent.startsWith('MIRA: ⏳')) {
    elementos[elementos.length - 1].remove();
  }
  mostrarMensaje('MIRA', respuesta);
  historialConversacion.push({ role: 'assistant', content: respuesta });
  actualizarMemoriaTemporal();
}

async function llamarAPI(historial) {
  const prompt = historial.map(turno => `${turno.role === 'user' ? 'Usuario' : 'MIRA'}: ${turno.content}`).join('\n');
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer sk-antofagasta"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [
          { role: "system", content: "Eres MIRA, una IA educativa amigable que responde de forma clara y directa. Si el usuario cambia de tema, enfócate en la nueva consulta." },
          ...historial
        ],
        temperature: 0.7
      })
    });
    const data = await res.json();
    return data.choices[0]?.message?.content || "Lo siento, no entendí eso.";
  } catch (e) {
    return "⚠️ Hubo un error al conectar con el servidor. Intenta más tarde.";
  }
}
