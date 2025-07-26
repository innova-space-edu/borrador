// backend/server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // Si usas Node v18+, puedes eliminar esta línea y usar fetch global
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('✅ Servidor backend de MIRA activo.');
});

// Endpoint seguro para BLIP Hugging Face
app.post('/api/blip', async (req, res) => {
  const hfToken = process.env.HF_TOKEN;
  const { inputs } = req.body;
  if (!inputs || !hfToken) {
    return res.status(400).json({ error: 'Falta imagen o clave Hugging Face.' });
  }

  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs }),
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo describir la imagen.' });
  }
});

// Opcional: endpoint para OCR.space (si quieres hacer lo mismo con OCR seguro)
app.post('/api/ocr', async (req, res) => {
  const ocrKey = process.env.OCR_KEY;
  const { base64Image } = req.body;
  if (!base64Image || !ocrKey) {
    return res.status(400).json({ error: 'Falta imagen o clave OCR.' });
  }
  try {
    const response = await fetch(
      'https://api.ocr.space/parse/image',
      {
        method: 'POST',
        headers: {
          apikey: ocrKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `base64Image=${encodeURIComponent(base64Image)}`,
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo extraer texto.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor backend de MIRA AI corriendo en http://localhost:${PORT}/`);
});
