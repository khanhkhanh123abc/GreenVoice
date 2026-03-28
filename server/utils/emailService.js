import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// ─────────────────────────────────────────────
//  Tạo Transporter (Gmail SMTP)
// ─────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (không phải mật khẩu thường)
  },
});

/**
 * Hàm gửi email chung
 * @param {string} to       - Email người nhận (hoặc mảng email)
 * @param {string} subject  - Tiêu đề email
 * @param {string} html     - Nội dung HTML của email
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"COMP1640 System 🎓" <${process.env.EMAIL_USER}>`,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      html,
    });
    console.log(`✅ Email sent to ${to} | MessageId: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    throw err;
  }
};

// ─────────────────────────────────────────────
//  Template Base (khung HTML chung)
// ─────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f4f8; color: #1a202c; }
    .wrapper { max-width: 620px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 36px 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .header p { color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px; }
    .body { padding: 36px 40px; }
    .body p { line-height: 1.7; color: #374151; font-size: 15px; margin-bottom: 12px; }
    .body h2 { font-size: 18px; color: #1e3a5f; margin-bottom: 16px; }
    .highlight-box { background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .highlight-box p { margin: 0; font-size: 14px; color: #1e40af; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px; box-shadow: 0 4px 15px rgba(37,99,235,0.4); }
    .stats-grid { display: flex; gap: 16px; margin: 20px 0; flex-wrap: wrap; }
    .stat-card { flex: 1; min-width: 130px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-card .number { font-size: 28px; font-weight: 700; color: #2563eb; }
    .stat-card .label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .top-idea { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 10px; padding: 16px; margin: 16px 0; }
    .top-idea .badge { display: inline-block; background: #f97316; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px; margin-bottom: 8px; }
    .top-idea h3 { font-size: 15px; color: #92400e; margin-bottom: 6px; }
    .top-idea .meta { font-size: 13px; color: #b45309; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #9ca3af; line-height: 1.6; }
    .footer strong { color: #6b7280; }
    @media (max-width: 480px) {
      .body, .header { padding: 24px 20px; }
      .stats-grid { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎓 COMP1640 Enterprise Web</h1>
      <p>Hệ thống quản lý ý kiến sinh viên</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ hệ thống <strong>COMP1640 EnterpriseWeb</strong>.<br/>Vui lòng không reply trực tiếp email này.</p>
    </div>
  </div>
</body>
</html>
`;

// ─────────────────────────────────────────────
//  Template 1: Thông báo Topic mới cho Staff
// ─────────────────────────────────────────────
export const buildNewTopicEmail = ({ staffName, topicName, topicDescription, creatorName, openDate, closureDate, topicLink }) => {
  const subject = `📢 Topic mới: "${topicName}" - Hãy chia sẻ ý kiến của bạn!`;
  const html = baseTemplate(`
    <h2>Xin chào, ${staffName}!</h2>
    <p>Một topic mới vừa được đăng lên hệ thống bởi <strong>${creatorName}</strong>. Đây là cơ hội để bạn chia sẻ ý kiến và đóng góp cho cộng đồng học thuật.</p>

    <div class="highlight-box">
      <p><strong>📌 Topic:</strong> ${topicName}</p>
      ${topicDescription ? `<p style="margin-top:6px;"><strong>📝 Mô tả:</strong> ${topicDescription}</p>` : ""}
      ${openDate ? `<p style="margin-top:6px;"><strong>📅 Ngày mở:</strong> ${openDate}</p>` : ""}
      ${closureDate ? `<p style="margin-top:6px;"><strong>⏰ Hạn chót:</strong> ${closureDate}</p>` : ""}
    </div>

    <p>Nhấn vào nút bên dưới để xem chi tiết topic và bắt đầu đăng ý kiến của bạn ngay hôm nay!</p>

    <div class="btn-container">
      <a href="${topicLink}" class="btn">🚀 Xem Topic & Đăng Ý Kiến</a>
    </div>

    <hr class="divider"/>
    <p style="font-size:13px; color:#9ca3af;">Nếu nút không hoạt động, copy và dán link sau vào trình duyệt:<br/>
    <a href="${topicLink}" style="color:#2563eb;">${topicLink}</a></p>
  `);
  return { subject, html };
};

// ─────────────────────────────────────────────
//  Template 2: Daily Stats Email cho QAC
// ─────────────────────────────────────────────
export const buildDailyStatsEmail = ({ qacName, topicName, reportDate, newIdeasToday, totalViews, topIdea, closureDate, topicLink }) => {
  const subject = `📊 Báo cáo cuối ngày ${reportDate}: Topic "${topicName}"`;

  const topIdeaSection = topIdea
    ? `
    <p><strong>🏆 Idea nổi bật nhất hôm nay:</strong></p>
    <div class="top-idea">
      <span class="badge">⭐ Reaction cao nhất</span>
      <h3>${topIdea.title}</h3>
      <p class="meta">
        👍 ${topIdea.reactions} reactions &nbsp;|&nbsp; 👁️ ${topIdea.views} lượt xem
        ${topIdea.authorName ? `&nbsp;|&nbsp; ✍️ ${topIdea.authorName}` : ""}
      </p>
      <div style="margin-top:12px;">
        <a href="${topIdea.ideaLink}" style="color:#2563eb; font-size:13px; text-decoration:none; font-weight:600;">👉 Xem idea →</a>
      </div>
    </div>`
    : `<p>Chưa có idea nào được đăng trong ngày hôm nay.</p>`;

  const html = baseTemplate(`
    <h2>Báo cáo hoạt động hàng ngày</h2>
    <p>Xin chào <strong>${qacName}</strong>,</p>
    <p>Đây là tóm tắt hoạt động của topic <strong>"${topicName}"</strong> trong ngày <strong>${reportDate}</strong>.</p>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="number">${newIdeasToday}</div>
        <div class="label">💡 Ideas mới hôm nay</div>
      </div>
      <div class="stat-card">
        <div class="number">${totalViews}</div>
        <div class="label">👁️ Lượt xem hôm nay</div>
      </div>
    </div>

    ${topIdeaSection}

    <hr class="divider"/>
    ${closureDate ? `<p>⏰ <strong>Hạn chót topic:</strong> ${closureDate}</p>` : ""}

    <div class="btn-container">
      <a href="${topicLink}" class="btn">📋 Xem toàn bộ Topic</a>
    </div>
  `);
  return { subject, html };
};

// ─────────────────────────────────────────────
//  Template 3: Thông báo Report mới cho Admin
// ─────────────────────────────────────────────
export const buildReportNotificationEmail = ({ adminName, qacName, qacEmail, reportTitle, reportType, reportContent, reportLink }) => {
  const subject = `🚨 Report mới từ QAC: "${reportTitle}"`;
  const html = baseTemplate(`
    <h2>Có Report mới cần xử lý!</h2>
    <p>Xin chào <strong>${adminName}</strong>,</p>
    <p>QA Coordinator <strong>${qacName}</strong> vừa gửi một report mới lên hệ thống và đang chờ bạn xem xét.</p>

    <div class="highlight-box">
      <p><strong>📋 Tiêu đề:</strong> ${reportTitle}</p>
      <p style="margin-top:6px;"><strong>🏷️ Loại:</strong> ${reportType || "Chung"}</p>
      <p style="margin-top:6px;"><strong>👤 Người gửi:</strong> ${qacName} &lt;${qacEmail}&gt;</p>
      ${reportContent ? `<p style="margin-top:10px; padding-top:10px; border-top:1px solid #bfdbfe;"><strong>📝 Nội dung:</strong><br/>${reportContent.substring(0, 200)}${reportContent.length > 200 ? "..." : ""}</p>` : ""}
    </div>

    <p>Nhấn vào nút bên dưới để xem chi tiết và xử lý report này.</p>

    <div class="btn-container">
      <a href="${reportLink}" class="btn">🔍 Xem & Xử lý Report</a>
    </div>

    <hr class="divider"/>
    <p style="font-size:13px; color:#9ca3af;">Nếu nút không hoạt động, copy và dán link sau vào trình duyệt:<br/>
    <a href="${reportLink}" style="color:#2563eb;">${reportLink}</a></p>
  `);
  return { subject, html };
};