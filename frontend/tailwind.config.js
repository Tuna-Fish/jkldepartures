/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark surface palette — Helsinki metro vibes
        surface: {
          base:    '#0d0f14',   // page background
          raised:  '#161b24',   // card background
          overlay: '#1e2535',   // modal / popover
          border:  '#2a3347',   // dividers
        },
        // Route number pill colors (matches Finnish bus branding conventions)
        route: {
          blue:   '#1565C0',
          green:  '#2E7D32',
          red:    '#C62828',
          orange: '#E65100',
          purple: '#6A1B9A',
          teal:   '#00695C',
        },
        // Semantic status colors
        status: {
          ontime:   '#4CAF50',
          delayed:  '#FF9800',
          cancelled:'#F44336',
          nodata:   '#78909C',
        },
        // Accent — electric blue for interactive elements
        accent: {
          DEFAULT: '#2979FF',
          hover:   '#448AFF',
          muted:   '#1A3A7A',
        },
      },
      fontFamily: {
        // Display font for route numbers and headings — tabular, bold, transit feel
        display: ['"DM Mono"', 'ui-monospace', 'monospace'],
        // Body — clean, readable, Scandinavian
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },              to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: '0' },
                   to:   { transform: 'translateY(0)',   opacity: '1' } },
      },
    },
  },
  plugins: [],
}