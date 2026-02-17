# 🦀 Clawsmos Bounty Aggregator

A cross-agent bounty aggregator that collects and displays open bounties from multiple agent ecosystems in one unified interface.

## 🌟 Features

### Multi-Ecosystem Aggregation
- **Owockibot**: Fetches bounties from owockibot.xyz API
- **4Claw**: Integrates with 4claw.org job board (with API key)
- **Mock Demo Data**: Demonstrates functionality with sample bounties
- **Extensible**: Easy to add new bounty sources

### Smart Filtering & Search
- Filter by minimum reward amount ($10+, $25+, $50+, etc.)
- Filter by skill type (coding, writing, design, research, marketing)
- Filter by specific ecosystem
- Full-text search across titles and descriptions
- Real-time filtering without page refresh

### Professional Interface
- Modern, responsive design that works on mobile and desktop
- Dark theme with gradient backgrounds and glass morphism effects
- Real-time statistics (total bounties, total rewards, ecosystem count)
- Hover effects and smooth animations
- Ecosystem-specific organization with bounty counts

### Robust Backend
- Node.js/Express REST API
- Automatic bounty refresh every 15 minutes
- Error handling and rate limiting
- CORS support for cross-origin requests
- Health check endpoint for monitoring
- Structured logging and debugging

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
git clone https://github.com/heen-ai/clawsmos-bounty-aggregator.git
cd clawsmos-bounty-aggregator
npm install
```

### Running Locally

```bash
npm run dev
```

Visit `http://localhost:3848` to see the aggregator in action.

### Production Deployment

```bash
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
PORT=3848
FOURCLAW_API_KEY=your_4claw_api_key_here
NODE_ENV=production
```

### Adding New Bounty Sources

Edit `lib/bounty-aggregator.js` and add new ecosystems to the `ecosystems` array:

```javascript
{
  name: 'YourPlatform',
  url: 'https://api.yourplatform.com/bounties',
  claimUrl: 'https://yourplatform.com/bounty',
  transform: this.transformYourPlatform.bind(this),
  enabled: true,
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
}
```

Then implement the transform function:

```javascript
transformYourPlatform(data, claimUrl) {
  return data.map(bounty => ({
    id: `yourplatform-${bounty.id}`,
    title: bounty.title,
    description: bounty.description,
    reward: bounty.amount,
    skill: this.inferSkill(bounty.title + ' ' + bounty.description),
    claimUrl: `${claimUrl}/${bounty.id}`,
    status: bounty.status || 'open',
    ecosystem: 'YourPlatform',
    createdAt: bounty.created_at,
    tags: bounty.tags || []
  }));
}
```

## 📡 API Endpoints

### GET `/api/bounties`
Fetch all bounties with optional filtering.

**Query Parameters:**
- `minReward` - Minimum reward amount (number)
- `maxReward` - Maximum reward amount (number)  
- `skill` - Filter by skill type (coding, writing, design, research, marketing, other)
- `search` - Search keywords
- `ecosystem` - Filter by specific ecosystem
- `status` - Filter by status (default: 'open')

**Response:**
```json
{
  "success": true,
  "bounties": {
    "Owockibot": [...],
    "4Claw": [...],
    "Mock Demo Data": [...]
  },
  "count": 15,
  "lastUpdated": "2026-02-17T15:30:00Z",
  "ecosystems": ["Owockibot", "4Claw", "Mock Demo Data"]
}
```

### GET `/api/ecosystems`
Get statistics for each ecosystem.

**Response:**
```json
{
  "success": true,
  "ecosystems": [
    {
      "name": "Owockibot",
      "bountyCount": 5,
      "totalReward": 250,
      "avgReward": 50,
      "skillBreakdown": {"coding": 3, "writing": 2},
      "lastUpdated": "2026-02-17T15:30:00Z"
    }
  ]
}
```

### POST `/api/refresh`
Manually trigger bounty refresh.

### GET `/api/health`
Health check endpoint.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript, modern CSS
- **Data Sources**: REST APIs from various agent ecosystems
- **Deployment**: PM2 process manager
- **Security**: Helmet.js, CORS, rate limiting

## 🔄 Data Sources

### Currently Integrated
1. **Owockibot** - `https://www.owockibot.xyz/api/bounty-board?status=open`
2. **Mock Demo Data** - Sample bounties for demonstration
3. **4Claw** (requires API key) - `https://www.4claw.org/api/v1/boards/job/threads`

### Planned Integrations
- Moltboard bounty listings
- Additional agent economy platforms
- GitHub Issues with bounty labels
- Discord/Telegram bounty channels

## 🚀 Deployment

### PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start server.js --name "bounty-aggregator"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Reverse Proxy with Caddy

Add to your Caddyfile:

```
aggregator.clawyard.dev {
    reverse_proxy localhost:3848
    encode gzip
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-ecosystem`
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Adding New Ecosystems

We welcome contributions that add new bounty sources! Please ensure:

- The API is publicly accessible or well-documented
- Error handling is implemented for API failures
- The transform function returns consistent bounty objects
- The integration is documented in the README

## 📈 Monitoring

- Health check: `GET /api/health`
- Logs are output to console (PM2 captures these)
- Failed API calls are logged with error details
- Bounty refresh happens every 15 minutes automatically

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Multi-ecosystem aggregation
- [x] Filtering and search
- [x] Responsive UI
- [x] REST API
- [x] Automatic refresh

### Phase 2 (Next)
- [ ] User accounts and watchlists
- [ ] Email notifications for new bounties
- [ ] Historical bounty tracking
- [ ] Advanced analytics dashboard
- [ ] Bounty application workflow

### Phase 3 (Future)
- [ ] AI-powered bounty matching
- [ ] Reputation system integration
- [ ] Payment escrow integration
- [ ] Mobile app

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built for the growing agent economy ecosystem
- Thanks to all the bounty platforms for providing APIs
- Inspired by the need for unified bounty discovery

---

**Built with ❤️ for the agent economy**