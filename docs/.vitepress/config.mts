import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'rs2b2t',
  description: 'Independent rs2b2t client and scripting API documentation',
  base: '/rs2b2t-api-docs/',
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
      { text: 'Start Here', items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Writing Reliable Scripts', link: '/guide/patterns' },
        { text: 'ABI and Package Boundary', link: '/concepts/abi' }
      ]},
      { text: 'API Reference', items: [
        { text: 'Overview', link: '/api/' }, { text: 'Coverage & Drift Audit', link: '/api/coverage' },
        { text: 'Generated Member Audit', link: '/api/generated-audit' },
        { text: 'Bots', link: '/api/bots' }, { text: 'Execution', link: '/api/execution' },
        { text: 'Game', link: '/api/game' }, { text: 'Entities & Queries', link: '/api/entities' },
        { text: 'Inventory', link: '/api/inventory' }, { text: 'Equipment', link: '/api/equipment' },
        { text: 'Skills', link: '/api/skills' }, { text: 'Banking', link: '/api/banking' },
        { text: 'Shops', link: '/api/shops' }, { text: 'Trade', link: '/api/trade' },
        { text: 'Dialogue', link: '/api/dialogue' }, { text: 'Quests', link: '/api/quests' },
        { text: 'Navigation', link: '/api/navigation' }, { text: 'Events', link: '/api/events' },
        { text: 'Settings', link: '/api/settings' }, { text: 'Acquisition & Tools', link: '/api/acquisition' },
        { text: 'World Catalogs', link: '/api/catalogs' }, { text: 'Low-Level Reader', link: '/api/reader' },
        { text: 'Client-ABI-Only APIs', link: '/api/client-only' }
      ]},
      { text: 'Contributing', items: [{ text: 'Source of Truth', link: '/contributing/source-of-truth' }] }
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/rs2b2t/rs2b0t' }],
    footer: { message: 'Independent documentation for the rs2b2t/rs2b0t client.', copyright: 'Source-grounded against rs2b2t/rs2b0t.' }
  }
});
