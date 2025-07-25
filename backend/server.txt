const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.post('/ocr', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const response = await axios.post('https://api.ocr.space/parse/image', null, {
      params: {
        apikey: process.env.OCR_API_KEY,
        url: imageUrl,
        language: 'spa',
        isOverlayRequired: false,
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'OCR request failed' });
  }
});

app.post('/caption', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base',
      {
        inputs: imageUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Caption request failed' });
  }
});

app.listen(PORT, () => console.log(`Servidor backend escuchando en puerto ${PORT}`));
