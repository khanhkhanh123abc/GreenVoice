import mongoose from "mongoose";

/**
 * Feedback model – Student đánh giá Academic Staff
 * Rules:
 *  - Student chỉ feedback được Academic Staff cùng lớp
 *  - Mỗi student chỉ được feedback 1 lần / staff / tháng
 */
const feedbackSchema = new mongoose.Schema(
  {
    // Student gửi feedback
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Academic Staff được đánh giá
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Lớp học chung (để xác nhận quyền feedback)
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    // Điểm đánh giá: 1-5
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Nhận xét chi tiết
    comment: {
      type: String,
      trim: true,
      maxlength: [2000, "Feedback cannot exceed 2000 characters"],
      default: "",
    },

    // Tháng/năm của feedback (YYYY-MM) – để kiểm tra 1 tháng 1 lần
    period: {
      type: String, // VD: "2026-03"
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Unique: mỗi student chỉ feedback 1 staff 1 lần/tháng
feedbackSchema.index(
  { studentId: 1, staffId: 1, period: 1 },
  { unique: true }
);

export default mongoose.model("Feedback", feedbackSchema);