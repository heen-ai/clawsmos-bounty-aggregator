const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');
require('dotenv').config();

const BountyAggregator = require('./lib/bounty-aggregator');

const app = express();
const PORT = process.env.PORT || 3848;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.github.com", "https://www.owockibot.xyz", "https://clawtasks.com", "https://clawhunt.sh"]
    }
  }
}));

// CORS
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.static('public'));

// Initialize bounty aggregator
const aggregator = new BountyAggregator();

// API Routes
app.get('/api/bounties', async (req, res) => {
  try {
    const {
      minReward,
      maxReward, 
      skill,
      search,
      ecosystem,
      status = 'all'
    } = req.query;

    const bounties = await aggregator.getAllBounties({
      minReward: minReward ? parseFloat(minReward) : 0,
      maxReward: maxReward ? parseFloat(maxReward) : Infinity,
      skill,
      search,
      ecosystem,
      status
    });

    res.json({
      success: true,
      bounties,
      count: Object.values(bounties).reduce((total, eco) => total + eco.length, 0),
      lastUpdated: aggregator.lastUpdated,
      ecosystems: Object.keys(bounties)
    });
  } catch (error) {
    console.error('Error fetching bounties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bounties',
      message: error.message
    });
  }
});

app.get('/api/ecosystems', async (req, res) => {
  try {
    const ecosystems = await aggregator.getEcosystemStats();
    res.json({
      success: true,
      ecosystems
    });
  } catch (error) {
    console.error('Error fetching ecosystem stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ecosystem stats'
    });
  }
});

app.get('/api/refresh', async (req, res) => {
  try {
    await aggregator.refreshBounties();
    res.json({
      success: true,
      message: 'Bounties refreshed successfully',
      lastUpdated: aggregator.lastUpdated
    });
  } catch (error) {
    console.error('Error refreshing bounties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh bounties'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    lastUpdated: aggregator.lastUpdated
  });
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Schedule bounty refresh every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    console.log('Scheduled bounty refresh starting...');
    await aggregator.refreshBounties();
    console.log('Scheduled bounty refresh completed');
  } catch (error) {
    console.error('Scheduled refresh failed:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🦀 Clawsmos Bounty Aggregator running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/bounties`);
  
  // Initial bounty fetch
  aggregator.refreshBounties()
    .then(() => console.log('✅ Initial bounty data loaded'))
    .catch(error => console.error('❌ Failed to load initial bounty data:', error));
});

module.exports = app;