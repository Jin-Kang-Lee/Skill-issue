/** @type {import('tailwindcss').Config} */
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: '#F9FAFB',       // light neutral background
        heading: '#1F2937',          // gray-800
        paragraph: '#6B7280',        // gray-500
        primary: '#6366F1',          // indigo-500 (buttons / links)
        secondary: '#8B5CF6',        // violet-500 (hover / accents)
        tertiary: '#A78BFA',         // violet-400 (lighter accent)
        accent: '#7C3AED',           // violet-600 (deepest accent)
        muted: '#E5E7EB',            // gray-200
      },
    },
  },
  plugins: [],
};