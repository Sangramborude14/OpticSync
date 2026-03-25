require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// ── MongoDB Setup ─────────────────────────────────────────────────
mongoose.connect('mongodb://localhost:27017/optisync-history')
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

app.post('/api/report', async (req, res) => {
  try {
    const { stats } = req.body;
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      return res.status(400).json({ error: 'Gemini API key is missing. Please add it to your .env file in the backend directory and restart the server.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `You are an expert occupational health and ergonomics advisor. 
Analyze the following daily eye strain and fatigue data for a user using an eye-tracking "OptiSync" system.
Strain ranges from 0 (Rested) to 100 (Severe Strain).

Data Summary:
- Average Daily Strain: ${stats?.avg || 0}%
- Peak Strain Level: ${stats?.peak || 0}% at ${stats?.peakTime || 'N/A'}

Provide a concise, encouraging, and highly professional Ergonomic Health Report. 
Structure your response exactly like this:
**Daily Assessment:** [Evaluate their average strain]
**Key Insights:** [Identify their peak strain moment and potential causes]
**Therapy Recommendation:** [Provide 1 actionable tip based on the data, like looking away or blinking]

Tone: Clinical yet empathetic, premium feel. Limit the total output to 120 words. No overly complex markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    res.json({ report: response.text });
  } catch (error) {
    console.error('Error generating AI report:', error);
    res.status(500).json({ error: 'Failed to generate AI report from Gemini' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 OptiSync Backend Terminal`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🛠️ Mode: Standard (Local Analytics)`);
});
