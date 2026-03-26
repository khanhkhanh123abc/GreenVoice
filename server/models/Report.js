import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    // Tiêu đề report
    title: {
      type: String,
      required: [true, "Report title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    // Nội dung chi tiết
    content: {
      type: String,
      required: [true, "Report content is required"],
      trim: true,
    },
    // Loại report
    type: {
      type: String,
      enum: ["idea", "user", "comment", "learning_material", "other"],
      required: [true, "Report type is required"],
    },
    // ID của target bị report (idea, user, comment, material…)
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // Người gửi report: chỉ QAC
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Trạng thái xử lý bởi Admin
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    // Ghi chú của Admin khi duyệt/từ chối
    adminNote: {
      type: String,
      default: "",
    },
    // Admin đã xử lý
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Report", reportSchema);