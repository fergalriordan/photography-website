/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: ' #fafafa',
        text: ' #1a1a1a',

        accent: {
          DEFAULT: ' #6b8ca0',
          light: ' #e6ecf0',
          dark: ' #4b6a7a',
        },

        seafoam: ' #8caea0',
        slate: ' #707070',

        gray: {
          light: ' #e5e5e5',
          DEFAULT: ' #707070',
          dark: ' #3a3a3a',
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
