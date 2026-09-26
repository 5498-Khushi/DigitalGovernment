/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Civic identity: deep navy authority + muted brass (official-seal accent)
        // on a warm paper background -- trustworthy, not startup-flashy.
        civic: {
          25: '#F8F6F1',
          50: '#F3F0E8',
          100: '#E6E1D3',
          200: '#C9C2AC',
          600: '#0F3D5C',
          700: '#0B2E45',
          800: '#082436',
          900: '#061A27'
        },
        brass: {
          50: '#FBF3E3',
          100: '#F0DDAF',
          400: '#C89A46',
          500: '#B4863A',
          600: '#96702F'
        },
        ink: '#1C2A33',
        status: {
          waiting: '#7A6A2E',
          approaching: '#B4863A',
          called: '#0F3D5C',
          serving: '#1D6F4A',
          completed: '#2F7A4D',
          missed: '#A33A3A'
        }
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(6, 26, 39, 0.06), 0 4px 12px rgba(6, 26, 39, 0.06)'
      },
      backgroundImage: {
        'ticket-notch':
          'radial-gradient(circle at 0 50%, transparent 10px, white 10.5px), radial-gradient(circle at 100% 50%, transparent 10px, white 10.5px)'
      }
    }
  },
  plugins: []
};
