import express from "express";
import {
  createIdea, getAllIdeas, getIdeaById,
  updateIdea, deleteIdea,
  addComment, toggleLike, deleteComment,
  reviewIdea, getPendingIdeas,
} from "../controllers/ideaController.js";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// GET /api/ideas/pending — danh sách idea chờ duyệt (QAC/Admin)
router.get("/pending", protect, authorize("QA Coordinator", "QA Manager", "Administrator"), getPendingIdeas);

// GET /api/ideas — danh sách idea
router.get("/", protect, getAllIdeas);

// GET /api/ideas/:id
router.get("/:id", protect, getIdeaById);

// POST /api/ideas — tạo idea mới
router.post("/", protect, authorize("Academic Staff", "Support Staff"), upload.array("documents", 5), createIdea);

// PATCH /api/ideas/:id/review — QAC duyệt/từ chối idea pending
router.patch("/:id/review", protect, authorize("QA Coordinator", "QA Manager", "Administrator"), reviewIdea);

// PUT /api/ideas/:id — cập nhật idea
router.put("/:id", protect, authorize("Academic Staff", "Support Staff"), updateIdea);

// DELETE /api/ideas/:id
router.delete("/:id", protect, authorize("Academic Staff", "Support Staff", "QA Coordinator", "QA Manager", "Administrator"), deleteIdea);

// Comments
router.post("/:id/comments", protect, addComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);

// Like
router.put("/:id/like", protect, toggleLike);

export default router;
