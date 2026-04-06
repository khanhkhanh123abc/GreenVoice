import LearningMaterial from "../models/LearningMaterial.js";
import User from "../models/User.js";

// ─────────────────────────────────────────────────────────────
//  HELPER: Gọi OpenAI API
// ─────────────────────────────────────────────────────────────
async function callGPT(messages, systemPrompt, maxTokens = 800) {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === "sk-your-openai-key-here") {
    throw new Error("OPENAI_API_KEY chưa được cấu hình trong .env");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenAI error body:", errText);
    throw new Error("OpenAI API error: " + response.status);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ─────────────────────────────────────────────────────────────
//  1. AI CHATBOT  –  POST /api/ai/chat
//  Chỉ dành cho Student
// ─────────────────────────────────────────────────────────────
export const chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Thu thập context từ database
    const materials = await LearningMaterial.find({ status: "published" })
      .populate("authorId", "name email department")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const materialsContext = materials.length > 0
      ? materials.map((m, i) =>
          "[" + (i+1) + "] Title: \"" + m.title + "\"\n" +
          "   Type: " + m.materialType + "\n" +
          "   Author: " + (m.authorId?.name || "Unknown") + " (" + (m.authorId?.email || "N/A") + ") - " + (m.authorId?.department || "N/A") + "\n" +
          "   Category: " + (m.categoryId?.name || "Uncategorized") + "\n" +
          "   Summary: " + m.content.substring(0, 200) + (m.content.length > 200 ? "..." : "") + "\n" +
          "   Views: " + m.views + " | Likes: " + (m.likes?.length || 0)
        ).join("\n\n")
      : "No materials available yet.";

    const lecturers = await User.find({ role: "Academic Staff" })
      .select("name email department")
      .lean();

    const lecturersContext = lecturers.length > 0
      ? lecturers.map(l => "- " + l.name + " | Email: " + l.email + " | Department: " + (l.department || "N/A")).join("\n")
      : "No staff listed yet.";

    const systemPrompt =
      "You are UniVoice AI Assistant, a helpful chatbot for students at this university.\n\n" +
      "You have access to real-time data from the system:\n\n" +
      "=== AVAILABLE LEARNING MATERIALS ===\n" + materialsContext + "\n\n" +
      "=== ACADEMIC STAFF DIRECTORY ===\n" + lecturersContext + "\n\n" +
      "=== YOUR ROLE ===\n" +
      "- Help students find relevant learning materials\n" +
      "- Provide lecturer contact info (name, email, department) when asked\n" +
      "- Be friendly, concise, helpful\n" +
      "- Answer ONLY based on the data above — do not make up information\n" +
      "- If something is not in the data, say so honestly\n" +
      "- Respond in the same language the student uses (Vietnamese or English)\n" +
      "- Keep responses concise (max 3-4 paragraphs)";

    const messages = [
      ...history.slice(-8).map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    const reply = await callGPT(messages, systemPrompt, 800);
    res.json({ reply });

  } catch (err) {
    console.error("AI Chat error:", err.message);
    // Trả 200 với message thân thiện thay vì 500
    res.json({
      reply: "Xin lỗi, AI Assistant đang gặp sự cố kỹ thuật. " +
             "Vui lòng kiểm tra OPENAI_API_KEY trong file .env và khởi động lại server. " +
             "Lỗi: " + err.message
    });
  }
};

// ─────────────────────────────────────────────────────────────
//  2. AI IDEA MODERATION  –  POST /api/ai/moderate-idea
// ─────────────────────────────────────────────────────────────
export const moderateIdea = async (req, res) => {
  try {
    const { title, content, topicType } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    const systemPrompt =
      "You are a content moderator for UniVoice university platform. " +
      "AUTO-APPROVE constructive ideas (teaching improvement, facilities, student welfare, academic proposals, innovation). " +
      "Set decision=review and confidence>=0.90 ONLY for: offensive language, personal attacks, spam, threats, completely meaningless content. " +
      "Reply with valid JSON only, no markdown: {\"decision\":\"approve\",\"confidence\":0.88,\"reason\":\"brief reason\"}";

    const userMsg = "Evaluate: Title=\"" + title + "\", Type=" + topicType + ", Content=\"" + content + "\"";

    const messages = [{ role: "user", content: userMsg }];
    const raw = await callGPT(messages, systemPrompt, 150);

    let result;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*?\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      result = { decision: "review", confidence: 0.5, reason: "Could not parse AI response" };
    }

    const decision = result.decision || "review";
    const confidence = Number(result.confidence) || 0.5;

    res.json({
      decision,
      confidence,
      reason: result.reason || "AI moderation completed",
      autoApproved: decision === "approve" && confidence >= 0.75,
    });
  } catch (err) {
    console.error("AI Moderation error:", err.message);
    res.json({ decision: "review", confidence: 0, reason: "AI unavailable", autoApproved: false });
  }
};
