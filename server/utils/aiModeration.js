// ═══════════════════════════════════════════════════════════════
//  server/utils/aiModeration.js
//  Engine kiểm duyệt nội dung — dùng chung cho Idea và Learning Material
//
//  Export:
//    moderateContent(title, content, contentType)
//      → { decision, confidence, reason, autoApproved, scores }
//
//  Quy trình 2 bước:
//    Bước 1 — Keyword Filter (không tốn API, chạy ngay)
//    Bước 2 — AI Rubric Scoring (gọi OpenAI nếu có key)
// ═══════════════════════════════════════════════════════════════

import { BLACKLIST, WHITELIST } from "../config/keywords.js";

// ── Ngưỡng điểm ───────────────────────────────────────────────
const THRESHOLD_AUTO_APPROVE = 70;   // >= 70 → auto approve
const THRESHOLD_PENDING      = 50;   // >= 50 → đăng lên, chờ QAC
                                     // <  50 → flagged, QAC phải xem
const THRESHOLD_BLOCK        = 0.90; // confidence >= 90% + decision=review → chặn hẳn

// ─────────────────────────────────────────────────────────────
//  BƯỚC 1: Keyword Filter
// ─────────────────────────────────────────────────────────────
function keywordFilter(title, content) {
  const text = (title + " " + content).toLowerCase();

  // Kiểm tra blacklist — chặn ngay nếu tìm thấy
  for (const word of BLACKLIST) {
    if (text.includes(word.toLowerCase())) {
      return {
        blocked: true,
        confidence: 0.95,
        reason: `Contains inappropriate keyword: "${word}"`,
        whitelistHits: 0,
      };
    }
  }

  // Đếm whitelist hits để boost điểm AI
  let whitelistHits = 0;
  for (const word of WHITELIST) {
    if (text.includes(word.toLowerCase())) whitelistHits++;
  }

  return { blocked: false, whitelistHits };
}

// ─────────────────────────────────────────────────────────────
//  BƯỚC 2: AI Rubric Scoring (OpenAI)
// ─────────────────────────────────────────────────────────────
async function callAIRubric(title, content, contentType) {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === "sk-your-openai-key-here") {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const systemPrompt =
    "You are a content moderator for UniVoice university platform. " +
    "Score the submitted content using a RUBRIC with 4 criteria. " +
    "Reply with JSON only (no markdown, no explanation):\n" +
    "{\n" +
    "  \"constructiveness\": <0-30>,\n" +
    "  \"feasibility\": <0-25>,\n" +
    "  \"relevance\": <0-25>,\n" +
    "  \"professionalism\": <0-20>,\n" +
    "  \"reason\": \"<one sentence>\"\n" +
    "}\n\n" +
    "SCORING GUIDE:\n" +
    "constructiveness (0-30): Genuine improvement suggestion? 25-30=excellent, 15-24=good, 5-14=vague, 0-4=none\n" +
    "feasibility (0-25): Realistically implementable? 20-25=very feasible, 12-19=possible, 5-11=unclear, 0-4=not feasible\n" +
    "relevance (0-25): Relevant to university life/education? 20-25=highly relevant, 12-19=somewhat, 5-11=loosely, 0-4=not relevant\n" +
    "professionalism (0-20): Respectful and professional tone? 16-20=excellent, 10-15=acceptable, 5-9=borderline, 0-4=inappropriate";

  const userMsg =
    `Score this ${contentType}:\n` +
    `Title: "${title}"\n` +
    `Type: ${contentType}\n` +
    `Content: "${content.substring(0, 400)}"`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + key,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 200,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMsg },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err.substring(0, 150)}`);
  }

  const data = await response.json();
  const raw = data.choices[0].message.content.trim();
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : raw);
}

// ─────────────────────────────────────────────────────────────
//  MAIN EXPORT: moderateContent()
// ─────────────────────────────────────────────────────────────
export async function moderateContent(title, content, contentType = "idea") {
  // ── Bước 1: Keyword filter ─────────────────────────────────
  const kf = keywordFilter(title, content);

  if (kf.blocked) {
    console.log(`🔴 KEYWORD BLOCKED: "${title}" — ${kf.reason}`);
    return {
      decision:     "review",
      confidence:   kf.confidence,
      reason:       kf.reason,
      autoApproved: false,
      scores:       null,
    };
  }

  // ── Bước 2: AI Rubric (nếu có API key) ─────────────────────
  let aiResult = null;
  try {
    aiResult = await callAIRubric(title, content, contentType);
  } catch (err) {
    console.warn(`⚠️  AI Rubric skipped (${err.message}) — using keyword-only mode`);
  }

  // ── Tổng hợp điểm ──────────────────────────────────────────
  let totalScore, scores;

  if (aiResult) {
    const c = Number(aiResult.constructiveness) || 0;
    const f = Number(aiResult.feasibility)      || 0;
    const r = Number(aiResult.relevance)        || 0;
    const p = Number(aiResult.professionalism)  || 0;
    totalScore = c + f + r + p;

    // Whitelist boost: mỗi hit +2 điểm, tối đa +10
    const boost = Math.min(kf.whitelistHits * 2, 10);
    const finalScore = Math.min(totalScore + boost, 100);

    scores = { constructiveness: c, feasibility: f, relevance: r, professionalism: p, totalScore, whitelistBoost: boost, finalScore };

    console.log(
      `🤖 AI Rubric: "${title}"\n` +
      `   Constructiveness: ${c}/30\n` +
      `   Feasibility:      ${f}/25\n` +
      `   Relevance:        ${r}/25\n` +
      `   Professionalism:  ${p}/20\n` +
      `   Keyword boost:    +${boost}\n` +
      `   Final score:      ${finalScore}/100`
    );

    // Quyết định theo finalScore
    let decision, autoApproved;
    if (finalScore >= THRESHOLD_AUTO_APPROVE) {
      decision = "approve"; autoApproved = true;
    } else if (finalScore >= THRESHOLD_PENDING) {
      decision = "approve"; autoApproved = false;
    } else {
      decision = "review";  autoApproved = false;
    }

    const confidence = parseFloat((finalScore / 100).toFixed(2));
    const reason = aiResult.reason || `Score: ${finalScore}/100`;

    console.log(`   → ${decision} (autoApproved=${autoApproved})`);

    return { decision, confidence, reason, autoApproved, scores };

  } else {
    // Không có AI → dùng whitelist-only mode
    const confidence = kf.whitelistHits >= 2 ? 0.75 : 0.50;
    const autoApproved = confidence >= 0.75;
    return {
      decision:     "approve",
      confidence,
      reason:       kf.whitelistHits >= 2
        ? `Contains ${kf.whitelistHits} positive university keywords`
        : "No harmful keywords detected — pending manual review",
      autoApproved,
      scores:       null,
    };
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPER: shouldBlock() — dùng trong controller để quyết định
//  có chặn idea/material hay không
// ─────────────────────────────────────────────────────────────
export function shouldBlock(moderation) {
  return moderation.decision === "review" && moderation.confidence >= THRESHOLD_BLOCK;
}
