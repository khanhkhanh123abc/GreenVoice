/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Vite rất cần dòng này
    "./src/**/*.{js,ts,jsx,tsx}", // Quét tất cả file code trong thư mục src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}