import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  createReport,
  getAllReports,
  getReportById,
  approveReport,
  rejectReport,
  deleteReport,
} from "../controllers/reportController.js";

const router = express.Router();

// ─── CRUD ────────────────────────────────────────────────────────────────────
// POST /api/reports        → Gửi report (chỉ QA Coordinator)
// GET  /api/reports        → Xem danh sách (Admin: tất cả | QAC: của mình)
router
  .route("/")
  .post(protect, authorize("QA Coordinator"), createReport)
  .get(protect, authorize("Administrator", "QA Coordinator"), getAllReports);

// GET    /api/reports/:id  → Xem chi tiết (Admin hoặc QAC chủ sở hữu)
// DELETE /api/reports/:id  → Xóa (Admin hoặc QAC nếu còn pending)
router
  .route("/:id")
  .get(protect, authorize("Administrator", "QA Coordinator"), getReportById)
  .delete(protect, authorize("Administrator", "QA Coordinator"), deleteReport);

// ─── Admin actions ────────────────────────────────────────────────────────────
// PATCH /api/reports/:id/approve  → Admin duyệt
// PATCH /api/reports/:id/reject   → Admin từ chối
router.patch("/:id/approve", protect, authorize("Administrator"), approveReport);
router.patch("/:id/reject", protect, authorize("Administrator"), rejectReport);

export default router;