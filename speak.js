function detectarIdioma(texto) {
  const palabrasEspanol = ["el", "la", "de", "y", "que", "una", "en", "con"];
  const palabrasIngles = ["the", "and", "is", "you", "of", "to", "in", "a"];
  let es = 0, en = 0;

  palabrasEspanol.forEach(p => { if (texto.includes(p)) es++; });
  palabrasIngles.forEach(p => { if (texto.includes(p)) en++; });

  return es >= en ? "es-ES" : "en-US";
}

function detectarTono(texto) {
  if (/¡(Cuidado|Atención|Advertencia)!/i.test(texto)) return "advertencia";
  if (/¿Sabías que|Dato curioso|Curiosidad/i.test(texto)) return "curiosidad";
  return "explicacion";
}

function obtenerVolumenSegunHora() {
  const hora = new Date().getHours();
  return (hora >= 22 || hora < 7) ? 0.3 : 1.0; // Volumen bajo en modo nocturno
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

function speak(textoOriginal) {
  try {
    const texto = plainTextForVoice(textoOriginal);
    if (!texto) return;

    const idioma = detectarIdioma(texto.toLowerCase());
    const tono = detectarTono(textoOriginal);
    const volumen = obtenerVolumenSegunHora();

    const msg = new SpeechSynthesisUtterance(texto);
    msg.lang = idioma;
    msg.volume = volumen;

    switch (tono) {
      case "advertencia":
        msg.pitch = 0.7;
        msg.rate = 1.1;
        break;
      case "curiosidad":
        msg.pitch = 1.4;
        msg.rate = 1.05;
        break;
      default:
        msg.pitch = 1;
        msg.rate = 1;
    }

    window.speechSynthesis.cancel();
    setAvatarTalking(true);
    msg.onend = () => setAvatarTalking(false);
    msg.onerror = () => setAvatarTalking(false);
    window.speechSynthesis.speak(msg);
  } catch (e) {
    setAvatarTalking(false);
    console.error("Error al hablar:", e);
  }
}
