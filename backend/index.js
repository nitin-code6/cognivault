const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// AI Service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

const upload = multer({ dest: 'uploads/' });

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// React -> Node -> Python -> Node -> React
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call the Python AI Service (Node -> Python)
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message })
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Service responded with status ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    
    // Return the response back to React
    res.json(data);
  } catch (error) {
    console.error('Error communicating with AI service:', error.message);
    res.status(500).json({ error: 'Failed to communicate with AI service' });
  }
});

// Document Upload Proxy
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const blob = new Blob([fs.readFileSync(req.file.path)]);
    const formData = new FormData();
    formData.append('file', blob, req.file.originalname);

    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/documents/upload`, {
      method: 'POST',
      body: formData
    });

    // Clean up the temp file
    fs.unlinkSync(req.file.path);

    if (!aiResponse.ok) {
      throw new Error(`AI Service responded with status ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    res.json(data);
  } catch (error) {
    console.error('Error uploading document:', error.message);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

app.listen(port, () => {
  console.log(`Backend service listening at http://localhost:${port}`);
});
