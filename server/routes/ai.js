import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { chat, moderateIdea } from "../controllers/aiController.js";

const router = express.Router();

// POST /api/ai/chat — Chatbot cho Student
router.post("/chat", protect, authorize("Student"), chat);

// POST /api/ai/moderate-idea — gọi từ ideaController
router.post("/moderate-idea", protect, moderateIdea);

// GET /api/ai/test — kiểm tra API key (Admin only)
router.get("/test", protect, authorize("Administrator"), async (req, res) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "sk-your-openai-key-here") {
    return res.status(400).json({ ok: false, error: "OPENAI_API_KEY chưa cấu hình trong .env" });
  }
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 10,
        messages: [{ role: "user", content: "Say OK" }]
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(400).json({ ok: false, error: data.error?.message || "API error", status: response.status });
    res.json({ ok: true, message: "OpenAI API hoạt động tốt ✅", reply: data.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
