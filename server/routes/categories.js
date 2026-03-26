import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// ──────────────────────────────────────────────────────────
//  Public-ish routes (Xem danh sách category)
// ──────────────────────────────────────────────────────────

// GET  /api/categories - Tất cả nhân viên đều có thể xem để chọn khi đăng bài
router.get("/", protect,
  //authorize("Administrator", "QA Manager", "QA Coordinator", "Academic Staff", "Support Staff"),
  getAllCategories);

// GET  /api/categories/:id - Xem chi tiết một category
router.get("/:id", protect,
  authorize("Administrator", "QA Manager", "QA Coordinator", "Academic Staff", "Support Staff"),
  getCategoryById);

// ──────────────────────────────────────────────────────────
//  Management routes (Chỉ Manager và Admin mới có quyền tạo/xóa)
// ──────────────────────────────────────────────────────────

// POST   /api/categories - Tạo mới category
router.post("/", protect,
  authorize("QA Manager", "Administrator"),
  createCategory);

// DELETE /api/categories/:id - Xóa category
router.delete("/:id", protect,
  authorize("QA Manager", "Administrator"),
  deleteCategory);

export default router;