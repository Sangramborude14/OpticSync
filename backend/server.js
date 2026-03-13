const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/optisync-history')
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if DB connection fails
  });

const strainSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  strain: Number,
  blinkCount: Number
});

const StrainRecord = mongoose.model('StrainRecord', strainSchema);

app.get('/api/health', (req, res) => {
  const rs = mongoose.connection.readyState;
  const status = rs === 1 ? 'Healthy' : 'Disconnected';
  res.json({ status, mongodb: status === 'Healthy' ? 'Connected' : 'Error', readyState: rs });
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
