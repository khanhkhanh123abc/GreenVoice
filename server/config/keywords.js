// ═══════════════════════════════════════════════════════════════
//  server/config/keywords.js
//  Danh sách từ khoá dùng cho AI moderation
//  Chỉnh sửa file này để thêm/bớt từ khoá — không cần đụng code logic
// ═══════════════════════════════════════════════════════════════

// ── BLACKLIST ─────────────────────────────────────────────────
// Idea/material chứa bất kỳ từ nào trong danh sách này sẽ bị chặn ngay
// mà không cần gọi AI API (tiết kiệm chi phí)
export const BLACKLIST = [
  // Personal attacks / xúc phạm cá nhân
  "idiot", "stupid", "dumb", "moron", "loser",
  "hate", "kill", "threat", "attack", "useless",
  "ngu", "đần", "khốn", "chửi", "đánh",
  "giết", "đe dọa", "tấn công", "vô dụng",

  // Spam / quảng cáo
  "click here", "buy now", "discount", "free money",
  "make money fast", "spam", "advertisement",
  "mua ngay", "giảm giá", "kiếm tiền", "quảng cáo",

  // Nội dung không phù hợp
  "sex", "porn", "nude", "racist", "discrimination",
  "violence", "illegal",
];

// ── WHITELIST ─────────────────────────────────────────────────
// Mỗi từ khớp sẽ cộng thêm điểm vào rubric score (tối đa +10 điểm)
// Giúp những idea/material rõ ràng liên quan đến trường được điểm cao hơn
export const WHITELIST = [
  // Cải thiện / đề xuất
  "improve", "improvement", "suggest", "proposal",
  "enhance", "better", "upgrade", "recommend",
  "cải thiện", "đề xuất", "đề nghị", "nâng cao",
  "cải tiến", "phát triển",

  // Cơ sở vật chất
  "facility", "library", "cafeteria", "lab",
  "classroom", "wifi", "internet", "equipment",
  "thư viện", "căng tin", "phòng lab", "lớp học",
  "wifi", "internet", "thiết bị",

  // Học thuật / giảng dạy
  "curriculum", "course", "syllabus", "lecture",
  "teaching", "professor", "lecturer", "academic",
  "chương trình", "học phần", "giảng viên", "học thuật",

  // Sinh viên / phúc lợi
  "student", "welfare", "mental health",
  "scholarship", "tuition", "fee", "extracurricular",
  "sinh viên", "học bổng", "học phí", "phúc lợi",

  // Nghiên cứu / đổi mới
  "research", "innovation", "technology",
  "software", "digital", "online", "project",
  "nghiên cứu", "công nghệ", "phần mềm", "dự án",

  // Môi trường / bền vững
  "environment", "sustainability", "green",
  "recycle", "energy", "carbon",
  "môi trường", "bền vững", "xanh", "tái chế",
];
