import mongoose from "mongoose";

// Cấu trúc cho từng cá nhân trong ngày hôm đó
const attendanceRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["Present", "Absent", "Late"], default: "Present" },
  note: { type: String, default: "" } // Ghi chú lý do vắng/trễ
});

// Cấu trúc cho cả 1 ngày điểm danh
const attendanceSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Lưu định dạng YYYY-MM-DD
  records: [attendanceRecordSchema],
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" } // Ai là người điểm danh?
}, { timestamps: true });

export default mongoose.model("Attendance", attendanceSchema);