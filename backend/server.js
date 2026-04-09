const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// ── MongoDB Setup ─────────────────────────────────────────────────
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/optisync-history';
mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

const strainSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  strain: Number,
  blinkCount: Number
});

const StrainRecord = mongoose.model('StrainRecord', strainSchema);

// ── Endpoints ─────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  const rs = mongoose.connection.readyState;
  res.json({
    status: 'online',
    mongodb: rs === 1 ? 'Connected' : 'Disconnected'
  });
});

app.post('/api/strain', async (req, res) => {
  try {
    const { strain, blinkCount } = req.body;
    const newRecord = new StrainRecord({ strain, blinkCount });
    await newRecord.save();
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record strain data' });
  }
});

app.get('/api/strain/today', async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const records = await StrainRecord.find({
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ timestamp: 1 });

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      strainSum: 0,
      count: 0
    }));

    records.forEach(record => {
      const hour = record.timestamp.getHours();
      hourlyData[hour].strainSum += record.strain;
      hourlyData[hour].count += 1;
    });

    const reportData = hourlyData
      .filter(data => data.count > 0)
      .map(data => ({
        time: `${String(data.hour).padStart(2, '0')}:00`,
        strain: Math.round(data.strainSum / data.count)
      }));

    res.json(reportData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch strain history' });
  }
});

// ── Gemini AI Chat Endpoint ───────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are OptiSync AI — an expert AI health assistant embedded inside OptiSync OS, a cognitive health monitoring system that tracks eye strain via webcam using MediaPipe Face Mesh.

Your role:
- Provide concise, helpful advice on eye health, digital wellness, blink rate, screen distance, posture, and cognitive fatigue.
- Recommend OptiSync's built-in therapy modules (Focus Shifter, Infinity Tracker, Corner Taps, Palming Audio, 20-20-20 Rule, Eye Massage) when appropriate.
- Explain metrics like EAR (Eye Aspect Ratio), strain percentage, blinks per minute.
- Be encouraging and supportive, like a caring health coach.
- Keep answers short (2-4 sentences) unless the user asks for details.
- Use emojis sparingly for friendliness.
- If the user asks about things unrelated to health or OptiSync, politely redirect.
- You may be given live context about the user's current strain level and blink rate — use it to personalize your advice.`;

async function callGemini(contents) {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512
      }
    });

    if (response.text) {
      console.log(`[Gemini] ✅ ${MODEL_NAME} responded successfully`);
      return { reply: response.text };
    }
    return { error: 'Empty response from AI model' };
  } catch (error) {
    console.error(`[Gemini] Error (${MODEL_NAME}):`, error.message);
    if (error.message.includes('quota')) {
      return { error: 'Your Gemini API key has exceeded its usage quota.' };
    }
    return { error: 'AI reasoning is temporarily unavailable. Please try again. 🔄' };
  }
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, context } = req.body;

    // Build conversation for Gemini
    const contents = [];

    // Add system instruction as first user turn
    let systemMessage = SYSTEM_PROMPT;
    if (context) {
      systemMessage += `\n\nCurrent user context:
- Strain Level: ${context.strain ?? 'N/A'}%
- Blink Rate: ${context.blinkRate ?? 'N/A'} BPM
- Status: ${context.status ?? 'Unknown'}
- Posture: ${context.posture ?? 'Unknown'}
- Face Distance from Screen: ${typeof context.distance === 'number' ? context.distance.toFixed(1) + ' cm' : 'Unknown'}`;
    }

    // Build alternating user/model conversation history
    contents.push({ role: 'user', parts: [{ text: systemMessage + '\n\nPlease acknowledge you are ready.' }] });
    contents.push({ role: 'model', parts: [{ text: 'I\'m OptiSync AI, ready to help you with your eye health and digital wellness. How can I help you today? 👁️' }] });

    // Add conversation history
    let lastRole = 'model';
    for (const msg of messages) {
      const currentRole = msg.role === 'user' ? 'user' : 'model';
      if (currentRole === lastRole) {
        // Append to the last message's parts
        contents[contents.length - 1].parts[0].text += '\n\n' + msg.content;
      } else {
        contents.push({
          role: currentRole,
          parts: [{ text: msg.content }]
        });
        lastRole = currentRole;
      }
    }

    const result = await callGemini(contents);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    res.json({ reply: result.reply });
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 OptiSync Backend Terminal`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🛠️ Mode: Standard (Local Analytics)`);
  console.log(`🤖 Gemini AI: ${GEMINI_API_KEY ? 'Configured' : '❌ Missing API Key'}`);
});
