import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Người nhận
    senderName: { type: String, required: true }, // Tên người gửi (hoặc Ẩn danh)
    ideaId: { type: mongoose.Schema.Types.ObjectId, ref: "Idea", required: true }, // Bấm vào để nhảy đến bài viết
    type: { type: String, enum: ["like", "comment", "report"], required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false } // Đã đọc hay chưa?
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);