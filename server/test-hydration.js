const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json());

// Test hydration routes
app.get('/api/hydration/today', (req, res) => {
  try {
    const todayHydration = 0; // ml
    const goal = 2250; // 9 glasses * 250ml
    
    res.json({
      todayHydration,
      goal,
      percentage: Math.min((todayHydration / goal) * 100, 100),
      logs: []
    });
  } catch (error) {
    console.error('Error fetching hydration data:', error);
    res.status(500).json({ error: 'Failed to fetch hydration data' });
  }
});

app.post('/api/hydration/log', (req, res) => {
  try {
    const { amount, type, notes } = req.body;
    
    if (!amount || amount === 0) {
      return res.status(400).json({ error: 'Amount must be provided' });
    }
    
    res.json({ 
      message: 'Hydration logged successfully',
      logged: { amount, type, notes, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error logging hydration:', error);
    res.status(500).json({ error: 'Failed to log hydration' });
  }
});

app.get('/api/hydration/history', (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const history = Array.from({ length: parseInt(days) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        total: Math.floor(Math.random() * 8) * 250
      };
    });
    
    res.json({ history });
  } catch (error) {
    console.error('Error fetching hydration history:', error);
    res.status(500).json({ error: 'Failed to fetch hydration history' });
  }
});

app.listen(PORT, () => {
  console.log(`🧪 Test Hydration Server running on port ${PORT}`);
  console.log(`📊 Test endpoint: http://localhost:${PORT}/api/hydration/today`);
});
