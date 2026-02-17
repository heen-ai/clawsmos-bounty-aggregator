const axios = require('axios');

class BountyAggregator {
  constructor() {
    this.bounties = {};
    this.lastUpdated = null;
    this.ecosystems = [
      {
        name: 'Owockibot',
        url: 'https://www.owockibot.xyz/api/bounty-board',
        claimUrl: 'https://www.owockibot.xyz/bounty',
        transform: this.transformOwockibot.bind(this),
        enabled: true
      },
      {
        name: 'ClawTasks',
        url: 'https://clawtasks.com/api/bounties',
        claimUrl: 'https://clawtasks.com',
        transform: this.transformClawTasks.bind(this),
        enabled: true
      },
      {
        name: 'ClawHunt',
        url: 'https://clawhunt.sh/api/bounties',
        claimUrl: 'https://clawhunt.sh',
        transform: this.transformClawHunt.bind(this),
        enabled: true
      }
    ];
  }

  async refreshBounties() {
    console.log('Refreshing bounties from all ecosystems...');
    const promises = this.ecosystems
      .filter(ecosystem => ecosystem.enabled)
      .map(async (ecosystem) => {
        try {
          let data;
          
          if (ecosystem.url) {
            const config = {
              timeout: 10000,
              headers: ecosystem.headers || {}
            };
            
            const response = await axios.get(ecosystem.url, config);
            data = response.data;
          } else {
            // Mock data for demo
            data = await ecosystem.transform();
          }
          
          const bounties = ecosystem.transform ? ecosystem.transform(data, ecosystem.claimUrl) : data;
          return {
            ecosystem: ecosystem.name,
            bounties: bounties || [],
            error: null
          };
        } catch (error) {
          console.error(`Error fetching from ${ecosystem.name}:`, error.message);
          return {
            ecosystem: ecosystem.name,
            bounties: [],
            error: error.message
          };
        }
      });

    const results = await Promise.all(promises);
    
    // Update bounties object
    this.bounties = {};
    results.forEach(result => {
      this.bounties[result.ecosystem] = result.bounties;
    });
    
    this.lastUpdated = new Date().toISOString();
    console.log(`✅ Bounties refreshed. Found ${this.getTotalBountyCount()} total bounties across ${Object.keys(this.bounties).length} ecosystems`);
    
    return this.bounties;
  }

  async getAllBounties(filters = {}) {
    if (!this.lastUpdated) {
      await this.refreshBounties();
    }

    const {
      minReward = 0,
      maxReward = Infinity,
      skill,
      search,
      ecosystem,
      status
    } = filters;

    const filtered = {};

    Object.entries(this.bounties).forEach(([ecosystemName, bounties]) => {
      // Filter by ecosystem if specified
      if (ecosystem && ecosystemName.toLowerCase() !== ecosystem.toLowerCase()) {
        return;
      }

      const filteredBounties = bounties.filter(bounty => {
        // Reward filter
        const reward = parseFloat(bounty.reward) || 0;
        if (reward < minReward || reward > maxReward) return false;

        // Skill filter
        if (skill && bounty.skill !== skill) return false;

        // Status filter
        if (status && status !== 'all' && bounty.status !== status) return false;

        // Search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const title = bounty.title ? bounty.title.toLowerCase() : '';
          const description = bounty.description ? bounty.description.toLowerCase() : '';
          
          if (!title.includes(searchLower) && !description.includes(searchLower)) {
            return false;
          }
        }

        return true;
      });

      filtered[ecosystemName] = filteredBounties;
    });

    return filtered;
  }

  async getEcosystemStats() {
    const stats = [];

    Object.entries(this.bounties).forEach(([name, bounties]) => {
      const totalReward = bounties.reduce((sum, bounty) => {
        return sum + (parseFloat(bounty.reward) || 0);
      }, 0);

      const skillCounts = {};
      bounties.forEach(bounty => {
        const skill = bounty.skill || 'other';
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });

      stats.push({
        name,
        bountyCount: bounties.length,
        totalReward: Math.round(totalReward * 100) / 100,
        avgReward: bounties.length > 0 ? Math.round((totalReward / bounties.length) * 100) / 100 : 0,
        skillBreakdown: skillCounts,
        lastUpdated: this.lastUpdated
      });
    });

    return stats;
  }

  getTotalBountyCount() {
    return Object.values(this.bounties).reduce((total, bounties) => total + bounties.length, 0);
  }

  // Transform functions for different ecosystems
  transformOwockibot(data, claimUrl) {
    if (!Array.isArray(data)) return [];
    
    return data.map(bounty => ({
      id: `owockibot-${bounty.id}`,
      title: bounty.title,
      description: this.truncateText(bounty.description, 200),
      reward: bounty.reward_usdc || 0,
      skill: this.inferSkill(bounty.title + ' ' + (bounty.description || '')),
      claimUrl: `${claimUrl}#${bounty.id}`,
      status: bounty.status || 'open',
      ecosystem: 'Owockibot',
      createdAt: bounty.created_at,
      tags: bounty.tags || []
    }));
  }

  transformClawTasks(data, claimUrl) {
    const bounties = data.bounties || data;
    if (!Array.isArray(bounties)) return [];
    
    return bounties.map(b => ({
      id: `clawtasks-${b.id}`,
      title: b.title,
      description: this.truncateText(b.description, 200),
      reward: parseFloat(b.amount) || 0,
      skill: this.inferSkill(b.title + ' ' + (b.description || '')),
      claimUrl: `${claimUrl}/bounties/${b.id}`,
      status: b.status || 'open',
      ecosystem: 'ClawTasks',
      createdAt: b.created_at,
      tags: b.tags || []
    }));
  }

  transformClawHunt(data, claimUrl) {
    const bounties = data.bounties || data;
    if (!Array.isArray(bounties)) return [];
    
    return bounties.map(b => ({
      id: `clawhunt-${b.id}`,
      title: b.title,
      description: this.truncateText(b.description, 200),
      reward: parseFloat(b.reward || b.amount) || 0,
      skill: b.skill || this.inferSkill(b.title + ' ' + (b.description || '')),
      claimUrl: `${claimUrl}/bounties/${b.id}`,
      status: b.status || 'open',
      ecosystem: 'ClawHunt',
      createdAt: b.created_at || b.createdAt,
      tags: b.tags || []
    }));
  }

  transform4Claw(data, claimUrl) {
    if (!Array.isArray(data)) return [];
    
    return data.map(thread => ({
      id: `4claw-${thread.id}`,
      title: thread.title,
      description: this.truncateText(thread.content, 200),
      reward: this.extractReward(thread.title + ' ' + thread.content),
      skill: this.inferSkill(thread.title + ' ' + thread.content),
      claimUrl: `${claimUrl}/boards/job/${thread.id}`,
      status: 'open',
      ecosystem: '4Claw',
      createdAt: thread.created_at,
      tags: thread.tags || []
    }));
  }

  transformMockData() {
    // Mock data for demonstration when other APIs are unavailable
    return [
      {
        id: 'demo-1',
        title: 'Build Twitter Bot for NFT Monitoring',
        description: 'Create a bot that monitors NFT collections on Twitter and posts updates to Discord. Should track floor prices, new listings, and major sales.',
        reward: 75,
        skill: 'coding',
        claimUrl: '#demo',
        status: 'open',
        ecosystem: 'Mock Demo Data',
        createdAt: new Date().toISOString(),
        tags: ['twitter', 'nft', 'discord', 'monitoring']
      },
      {
        id: 'demo-2', 
        title: 'Write Agent Economics Research Report',
        description: 'Research and write a comprehensive report on the emerging agent economy, covering current platforms, token economics, and future trends.',
        reward: 150,
        skill: 'writing',
        claimUrl: '#demo',
        status: 'open',
        ecosystem: 'Mock Demo Data',
        createdAt: new Date().toISOString(),
        tags: ['research', 'economics', 'agents', 'report']
      },
      {
        id: 'demo-3',
        title: 'Design Logo for Agent Platform',
        description: 'Create a modern, professional logo for a new agent marketplace. Should work in both light and dark themes.',
        reward: 50,
        skill: 'design',
        claimUrl: '#demo',
        status: 'open',
        ecosystem: 'Mock Demo Data',
        createdAt: new Date().toISOString(),
        tags: ['logo', 'branding', 'design', 'agents']
      },
      {
        id: 'demo-4',
        title: 'Integrate Stripe Payment Processing',
        description: 'Add Stripe integration to existing bounty platform for escrow payments. Include webhook handling for payment completion.',
        reward: 200,
        skill: 'coding',
        claimUrl: '#demo',
        status: 'open',
        ecosystem: 'Mock Demo Data',
        createdAt: new Date().toISOString(),
        tags: ['stripe', 'payments', 'integration', 'escrow']
      }
    ];
  }

  // Utility functions
  inferSkill(text) {
    const lower = text.toLowerCase();
    if (lower.includes('code') || lower.includes('sdk') || lower.includes('api') || 
        lower.includes('bot') || lower.includes('integrate') || lower.includes('develop') ||
        lower.includes('smart contract') || lower.includes('blockchain')) return 'coding';
    if (lower.includes('write') || lower.includes('thread') || lower.includes('blog') || 
        lower.includes('content') || lower.includes('article') || lower.includes('documentation')) return 'writing';
    if (lower.includes('design') || lower.includes('logo') || lower.includes('banner') || 
        lower.includes('ui') || lower.includes('ux') || lower.includes('graphics')) return 'design';
    if (lower.includes('research') || lower.includes('find') || lower.includes('analyze') ||
        lower.includes('investigate') || lower.includes('study')) return 'research';
    if (lower.includes('marketing') || lower.includes('social') || lower.includes('promote') ||
        lower.includes('campaign') || lower.includes('outreach')) return 'marketing';
    return 'other';
  }

  extractReward(text) {
    // Try to extract monetary reward from text
    const patterns = [
      /\$(\d+(?:\.\d{2})?)/,  // $50, $50.00
      /(\d+)\s*(?:USD|USDC|usdc)/i,  // 50 USD, 50 USDC
      /(\d+)\s*dollars?/i  // 50 dollars
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    return 0; // Default if no reward found
  }

  truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

module.exports = BountyAggregator;