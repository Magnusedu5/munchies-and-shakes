/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: {
          900: '#090014', // Very dark purple/black for the base background
          800: '#1a0033', // Deep space purple for cards/containers
        },
        neon: {
          pink: '#ff00ff',   // Pure neon pink
          purple: '#b026ff', // Bright neon purple
          blue: '#00e5ff',   // High-contrast cyber blue
        }
      },
      fontFamily: {
        // You can import 'Orbitron' or 'Rajdhani' from Google Fonts in your index.html for a sci-fi look
        futuristic: ['Orbitron', 'sans-serif'], 
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        // Custom drop shadows to create glowing neon effects on buttons or borders
        'glow-pink': '0 0 10px #ff00ff, 0 0 20px #ff00ff',
        'glow-blue': '0 0 10px #00e5ff, 0 0 20px #00e5ff',
      }
    },
  },
  plugins: [],
}
