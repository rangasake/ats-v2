/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Static blue palette (used where org colours aren't dynamic)
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Dynamic org-branded colours — set via CSS vars from OrgContext.js
        'org-primary': 'var(--color-primary)',
        'org-accent':  'var(--color-accent)',
      },
      screens: {
        'xs': '375px',
      },
    },
  },
  plugins: [],
};
