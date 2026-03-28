import cron from "node-cron";
import Category from "../models/Category.js";
import Idea from "../models/Idea.js";
import User from "../models/User.js";
import { sendEmail, buildDailyStatsEmail } from "../utils/emailService.js";

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export const sendDailyTopicStats = async () => {
  try {
    const now = new Date();
    const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

    // Lấy tất cả categories đang trong thời gian mở
    const openCategories = await Category.find({
      openDate: { $lte: now },
      closureDate: { $gte: now },
    });

    if (openCategories.length === 0) {
      console.log("📭 [Daily Stats] Không có topic nào đang mở. Bỏ qua.");
      return;
    }

    const qacUsers = await User.find({ role: "QA Coordinator" }).select("name email");

    if (qacUsers.length === 0) {
      console.log("📭 [Daily Stats] Không có QA Coordinator nào trong hệ thống.");
      return;
    }

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const reportDate = formatDate(now);

    for (const category of openCategories) {
      const todayIdeas = await Idea.find({
        categoryId: category._id,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      })
        .populate({ path: "authorId", select: "name isAnonymous" })
        .lean();

      const newIdeasToday = todayIdeas.length;
      const totalViews = todayIdeas.reduce((sum, idea) => sum + (idea.views || 0), 0);

      let topIdeaDoc = null;
      if (todayIdeas.length > 0) {
        topIdeaDoc = todayIdeas.reduce((max, idea) =>
          (idea.reactions || 0) >= (max.reactions || 0) ? idea : max,
          todayIdeas[0]
        );
      } else {
        // Fallback: lấy idea reaction cao nhất trong toàn topic
        topIdeaDoc = await Idea.findOne({ categoryId: category._id })
          .populate({ path: "authorId", select: "name" })
          .sort({ reactions: -1, views: -1 })
          .lean();
      }

      const topIdea = topIdeaDoc
        ? {
            title: topIdeaDoc.title,
            reactions: topIdeaDoc.reactions || 0,
            views: topIdeaDoc.views || 0,
            authorName: topIdeaDoc.isAnonymous ? "Ẩn danh" : topIdeaDoc.authorId?.name || "Unknown",
            ideaLink: `${CLIENT_URL}/ideas/${topIdeaDoc._id}`,
          }
        : null;

      for (const qac of qacUsers) {
        const { subject, html } = buildDailyStatsEmail({
          qacName: qac.name,
          topicName: category.name,
          reportDate,
          newIdeasToday,
          totalViews,
          topIdea,
          closureDate: formatDate(category.closureDate),
          topicLink: `${CLIENT_URL}/ideas?category=${category._id}`,
        });

        await sendEmail(qac.email, subject, html);
        console.log(`📊 [Daily Stats] Đã gửi báo cáo topic "${category.name}" → ${qac.email}`);
      }
    }

    console.log(`✅ [Daily Stats] Hoàn tất gửi báo cáo cho ${openCategories.length} topic(s).`);
  } catch (err) {
    console.error("❌ [Daily Stats] Lỗi khi gửi báo cáo:", err.message);
  }
};

/**
 * Cron job chạy lúc 23:00 mỗi ngày
 * Để test nhanh, đổi thành "* * * * *" (mỗi phút)
 */
export const startDailyStatsCronJob = () => {
  cron.schedule("0 21 * * *", async () => {
    console.log(`\n⏰ [${new Date().toLocaleString("vi-VN")}] Chạy Daily Topic Stats Job...`);
    await sendDailyTopicStats();
  });

  console.log("📅 Daily Topic Stats Cron Job đã đăng ký (chạy lúc 21:00 mỗi ngày)");
};