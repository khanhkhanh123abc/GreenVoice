import mongoose from "mongoose";

/**
 * AttendanceWindow – khung giờ điểm danh do QA Coordinator tạo
 * QACoordinator mở 1 khung giờ → Staff điểm danh trong khung đó
 * Sau khi hết giờ hoặc bị lock → không điểm danh được nữa
 */
const attendanceWindowSchema = new mongoose.Schema(
  {
    coordinatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Coordinator is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    // Khung giờ bắt đầu và kết thúc cho phép điểm danh
    openFrom: {
      type: Date,
      required: [true, "Open time is required"],
    },
    openUntil: {
      type: Date,
      required: [true, "Close time is required"],
    },
    isLocked: {
      type: Boolean,
      default: false, // QACoordinator có thể lock thủ công sớm
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("AttendanceWindow", attendanceWindowSchema);