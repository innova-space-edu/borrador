<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>MIRA AI - Innova Space</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <link rel="stylesheet" href="style.css" />
</head>
<body class="bg-gradient-to-br from-black via-indigo-900 to-purple-900 text-white font-sans scroll-smooth">
  <div class="flex flex-col items-center p-4">
    <!-- Subida de imagen -->
    <div class="w-full max-w-xl mb-4">
      <label class="block text-sm font-medium text-purple-300">Sube una imagen para que MIRA la analice</label>
      <input type="file" accept="image/*" onchange="analyzeImage(event)"
        class="mt-2 text-sm text-purple-100 bg-purple-700 file:bg-purple-500 file:text-white file:px-3 file:py-1 file:rounded-md file:border-none rounded-md border border-purple-400 p-1 w-full" />
    </div>

    <!-- Chat -->
    <div id="chat-box" class="w-full max-w-3xl space-y-3 mb-16 px-2"></div>

    <!-- Input de usuario -->
    <div class="fixed bottom-0 left-0 right-0 bg-black bg-opacity-80 px-4 py-3 flex items-center justify-center space-x-2">
      <input id="user-input" type="text" placeholder="Escribe tu mensaje..."
        class="w-full max-w-3xl p-3 rounded-lg text-black" />
      <button id="send-btn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg">
        Enviar
      </button>
    </div>
  </div>

  <!-- AVATAR flotante -->
  <img id="avatar-mira" src="avatar-mira.svg" class="fixed bottom-24 right-4 z-50 cursor-pointer" title="MIRA" />

  <!-- Scripts -->
  <script src="chat.js"></script>
  <script src="speak.js"></script>

  <!-- Lógica de análisis de imágenes -->
  <script>
    async function analyzeImage(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1];
        const choice = confirm("¿Quieres extraer texto de la imagen (OCR)?\nPresiona Cancelar para obtener descripción IA.");

        const url = choice
          ? "https://api.ocr.space/parse/image"
          : "http://localhost:3001/api/blip";

        const headers = choice
          ? { apikey: "K82378316388957", "Content-Type": "application/x-www-form-urlencoded" }
          : { "Content-Type": "application/json" };

        const body = choice
          ? new URLSearchParams({ base64Image: `data:image/png;base64,${base64Image}` }).toString()
          : JSON.stringify({ inputs: `data:image/png;base64,${base64Image}` });

        try {
          const res = await fetch(url, { method: "POST", headers, body });
          const result = await res.json();

          const text = choice
            ? result.ParsedResults?.[0]?.ParsedText || "No se pudo leer texto."
            : result?.generated_text || "No se pudo generar descripción.";

          mostrarRespuestaImagen(text);
        } catch (e) {
          console.error("Error al analizar imagen:", e);
        }
      };
      reader.readAsDataURL(file);
    }

    function mostrarRespuestaImagen(text) {
      const chatBox = document.getElementById("chat-box");
      const div = document.createElement("div");
      div.innerHTML = `
        <div class="bg-purple-800 text-white p-4 rounded-xl shadow-lg max-w-2xl mx-auto">
          <strong>🖼️ MIRA (imagen):</strong><br>${text}
        </div>`;
      chatBox.appendChild(div);
      chatBox.scrollTop = chatBox.scrollHeight;
      if (typeof speak === "function") speak(text);
    }

    // Activar envío por botón
    document.getElementById("send-btn").addEventListener("click", () => {
      sendMessage();
    });

    // Activar envío por Enter
    document.getElementById("user-input").addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });
  </script>
</body>
</html>
