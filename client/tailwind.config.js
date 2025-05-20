/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // 👈 Critical for Tailwind to scan components
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D1B24', // dark navy
        primary: '#F06A5E',     // top wave (salmon)
        secondary: '#E75B64',   // mid wave
        tertiary: '#D1496D',    // deep rose
        accent: '#B82F72'       // base fuchsia
      }
    },
  },
  plugins: [],
}
