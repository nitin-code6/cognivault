const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// AI Service configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

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

app.listen(port, () => {
  console.log(`Backend service listening at http://localhost:${port}`);
});
