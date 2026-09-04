// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", // adjust to your project
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animate")],
};
