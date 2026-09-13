/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f6ff",
          100: "#eceeff",
          500: "#5457f5",
          600: "#4143d6",
          700: "#3335ab",
        },
      },
    },
  },
  plugins: [],
};
