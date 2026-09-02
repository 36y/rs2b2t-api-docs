import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'rs2b2t',
  description: 'Complete rs2b0t client and scripting API documentation',
  cleanUrls: true,
  lastUpdated: true,
  head: [['meta', { name: 'theme-color', content: '#111827' }]],
  themeConfig: {
    siteTitle: 'rs2b2t',
    nav: [
      { text: 'Docs', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: 'GitHub', link: 'https://github.com/rs2b2t/rs2b0t' }
    ],
    search: { provider: 'local' },
    sidebar: [
      { text: 'Start here', items: [
        { text: 'Getting started', link: '/guide/getting-started' },
        { text: 'Writing reliable scripts', link: '/guide/patterns' },
        { text: 'ABI and package boundary', link: '/concepts/abi' }
      ]},
      { text: 'API Reference', items: [
        { text: 'Overview', link: '/api/' }, { text: 'Bots', link: '/api/bots' },
        { text: 'Execution', link: '/api/execution' }, { text: 'Game', link: '/api/game' },
        { text: 'Entities & Queries', link: '/api/entities' }, { text: 'Inventory', link: '/api/inventory' },
        { text: 'Equipment', link: '/api/equipment' }, { text: 'Skills', link: '/api/skills' },
        { text: 'Banking', link: '/api/banking' }, { text: 'Shops', link: '/api/shops' },
        { text: 'Trade', link: '/api/trade' }, { text: 'Dialogue', link: '/api/dialogue' },
        { text: 'Quests', link: '/api/quests' }, { text: 'Navigation', link: '/api/navigation' },
        { text: 'Events', link: '/api/events' }, { text: 'Settings', link: '/api/settings' },
        { text: 'Acquisition & Tools', link: '/api/acquisition' }, { text: 'World Catalogs', link: '/api/catalogs' },
        { text: 'Low-level reader', link: '/api/reader' }, { text: 'Client-ABI-only APIs', link: '/api/client-only' }
      ]},
      { text: 'Contributing', items: [{ text: 'Source of truth', link: '/contributing/source-of-truth' }] }
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/rs2b2t/rs2b0t' }],
    footer: { message: 'Independent documentation for the rs2b2t/rs2b0t client.', copyright: 'Source-grounded against rs2b2t/rs2b0t.' }
  }
});
