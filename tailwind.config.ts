import type { Config } from 'tailwindcss';

// Design tokens for "Lineage" - an archival ledger / pedigree-chart aesthetic.
// Palette deliberately avoids the generic warm-cream+terracotta AI default:
// ink-navy for structure/text, aged parchment for surfaces, a muted forest
// green for living/primary lineage lines, and a brass accent reserved for
// the single focal person in the tree.
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1B2A41',
          soft: '#3B4B63',
          faint: '#7B879A',
        },
        parchment: {
          DEFAULT: '#EAE3D3',
          dark: '#DDD3BC',
          light: '#F5F1E7',
        },
        lineage: {
          DEFAULT: '#3F6B4C',
          soft: '#6E9179',
        },
        brass: {
          DEFAULT: '#B08D57',
          soft: '#D3B67F',
        },
        rose: {
          DEFAULT: '#9C4A44',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '4px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
};

export default config;
