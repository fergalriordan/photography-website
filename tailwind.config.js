/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f4f5f7',      // very light cool grey
        text: '#222222',            // almost black

        accent: {
          DEFAULT: '#5f7a8e',       // muted steel blue
          light: '#d7e0e9',         // soft light blue
          dark: '#435463',          // dark slate blue
        },

        bluegreen: '#a0b1b8',         // muted blue-green
        slate: '#6d6d6d',

        gray: {
          light: '#d9d9d9',
          DEFAULT: '#6f6f6f',
          dark: '#363636',
        },
      },
      boxShadow: {
        soft: `
          0 2px 6px rgba(0, 0, 0, 0.05), 
          0 8px 24px rgba(0, 0, 0, 0.07), 
          0 16px 32px rgba(0, 0, 0, 0.07)
        `,
      },
    },
  },
  plugins: [],
};
