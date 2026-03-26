import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import './index.css'; // Bắt buộc giữ lại để chạy Tailwind CSS

const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9FAFB; color: #111827; -webkit-font-smoothing: antialiased; }
  input, textarea, select, button { font-family: inherit; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #F9FAFB; }
  ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
  a { text-decoration: none; color: inherit; }
`;
document.head.appendChild(style);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);