import express from "express";
import {
  createIdea,
  getAllIdeas,
  getIdeaById,
  updateIdea,
  deleteIdea,
  addComment,
  toggleLike,
  deleteComment
} from "../controllers/ideaController.js";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Lấy danh sách ý tưởng
router.get("/", protect,
  //authorize("Academic Staff", "Support Staff", "QA Coordinator", "QA Manager", "Administrator"),
  getAllIdeas);

// Lấy chi tiết một ý tưởng
router.get("/:id", protect,
  //authorize("Academic Staff", "Support Staff", "QA Coordinator", "QA Manager", "Administrator"),
  getIdeaById);

// POST /api/ideas – Tạo ý tưởng mới (ĐÃ TÍCH HỢP SẴN UPLOAD FILE Ở ĐÂY)
router.post(
  "/",
  protect,
  authorize("Academic Staff", "Support Staff"),
  upload.array("documents", 5), // Xử lý tối đa 5 file đính kèm
  createIdea
);

// PUT /api/ideas/:id – Cập nhật ý tưởng
router.put(
  "/:id",
  protect,
  authorize("Academic Staff", "Support Staff"),
  updateIdea
);

// DELETE /api/ideas/:id – Xóa ý tưởng
router.delete(
  "/:id",
  protect,
  authorize("Academic Staff", "Support Staff", "QA Coordinator", "QA Manager", "Administrator"),
  deleteIdea
);

// POST /api/ideas/:id/comments – Thêm bình luận
router.post(
  "/:id/comments",
  protect,
  addComment
);

// DELETE /api/ideas/:id/comments/:commentId - Xóa bình luận
router.delete("/:id/comments/:commentId", protect, deleteComment);

// PUT /api/ideas/:id/like – Thả tim/Bỏ tim
router.put("/:id/like", protect, toggleLike);

export default router;