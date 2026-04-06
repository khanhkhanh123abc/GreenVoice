import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createMaterial, getAllMaterials, getMaterialById,
  updateMaterial, deleteMaterial,
  toggleLike, addComment, deleteComment, toggleArchive,
  getPendingMaterials, reviewMaterial,
} from "../controllers/learningMaterialController.js";

const router = express.Router();

// GET /api/learning-materials/pending — danh sách chờ duyệt
router.get("/pending", protect, authorize("QA Coordinator", "QA Manager", "Administrator"), getPendingMaterials);

router.route("/")
  .post(protect, authorize("Academic Staff", "Support Staff"), upload.array("documents", 5), createMaterial)
  .get(protect, getAllMaterials);

router.route("/:id")
  .get(protect, getMaterialById)
  .put(protect, authorize("Academic Staff", "Support Staff"), updateMaterial)
  .delete(protect, deleteMaterial);

// PATCH /:id/review — QAC duyệt/từ chối
router.patch("/:id/review", protect, authorize("QA Coordinator", "QA Manager", "Administrator"), reviewMaterial);
router.patch("/:id/archive", protect, authorize("Administrator"), toggleArchive);
router.put("/:id/like", protect, toggleLike);
router.post("/:id/comments", protect, addComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);

export default router;
