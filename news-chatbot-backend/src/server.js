const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('redis');
const dotenv = require('dotenv');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const pool = require('./database'); // Make sure this exports a promise-compatible pool (e.g. mysql2/promise)
const { searchVectors } = require('./vector-db');
const fetch = require('node-fetch');

// Load environment variables
dotenv.config();
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json()); 
const PORT = process.env.PORT || 3000;

// Redis Client Setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  password: process.env.REDIS_PASSWORD
});

redisClient.on('error', (err) => console.error('Redis error:', err));

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }); // Use correct model name

// MySQL Database Connection Check
pool.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
  connection.release();
});

// Connect to Redis
redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch((err) => console.error('Redis connection failed:', err));

// Test Routes
app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get('/test', (req, res) => {
  res.send('Backend is working!');
});
// MySQL Database Connection Check
pool.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL database');
  connection.release();
});
// Connect to Redis
redisClient.connect()
  .then(() => console.log('Connected to Redis'))
  .catch((err) => console.error('Redis connection failed:', err));

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    console.log('req.body:', req.body); 
    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields: message or sessionId' });
    }

    console.log(`Received message: ${message}`);

    // Save user message in Redis
    await redisClient.lPush(sessionId, JSON.stringify({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    }));

    // Generate Embedding
    const embedding = await generateEmbedding(message);

    // Search Vector DB
    const results = await searchVectors(embedding);
    const context = results.map(r => r.payload?.content || '').join('\n');

    // Construct Prompt
    const prompt = `Context:\n${context}\n\nQuestion: ${message}`;
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    console.log('AI Response:', answer);

    // Save assistant reply in Redis
    await redisClient.lPush(sessionId, JSON.stringify({
      role: 'assistant',
      content: answer,
      timestamp: new Date().toISOString()
    }));

    // Set TTL (1 day)
    await redisClient.expire(sessionId, 86400);

    // Save in MySQL
    await pool.query(
      `INSERT INTO chat_sessions (session_id, message, response) VALUES (?, ?, ?)`,
      [sessionId, message, answer]
    );

    res.json({ answer });

  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      error: 'Chat processing failed',
      details: err.message
    });
  }
})

// Embedding Generation Function
async function generateEmbedding(text) {
  try {
    const response = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.JINA_API_KEY}`
      },
      body: JSON.stringify({
        input: text,
        model: 'jina-embeddings-v3'
      })
    });

    if (!response.ok) {
      throw new Error(`Jina API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data?.data?.[0]?.embedding) {
      throw new Error('Invalid embedding structure from Jina API');
    }

    return data.data[0].embedding;
  } catch (err) {
    console.error('Embedding generation failed:', err);
    throw err;
  }
}

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
