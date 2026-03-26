import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import {
  createMaterial,
  getAllMaterials,
  getMaterialById,
  updateMaterial,
  deleteMaterial,
  toggleLike,
  addComment,
  deleteComment,
  toggleArchive,
} from "../controllers/learningMaterialController.js";

const router = express.Router();

// ─── CRUD chính ───────────────────────────────────────────────────────────────
// POST   /api/learning-materials        → Tạo bài (Academic Staff | Support Staff)
// GET    /api/learning-materials        → Xem danh sách (tất cả role)
// GET    /api/learning-materials/:id    → Xem chi tiết (tất cả role)
// PUT    /api/learning-materials/:id    → Sửa (chính tác giả)
// DELETE /api/learning-materials/:id    → Xóa (tác giả hoặc Admin)

router
  .route("/")
  .post(
    protect,
    authorize("Academic Staff", "Support Staff"),
    upload.array("documents", 5),
    createMaterial
  )
  .get(protect, getAllMaterials);

router
  .route("/:id")
  .get(protect, getMaterialById)
  .put(
    protect,
    authorize("Academic Staff", "Support Staff"),
    updateMaterial
  )
  .delete(protect, deleteMaterial);

// ─── Like ─────────────────────────────────────────────────────────────────────
// PUT  /api/learning-materials/:id/like  → Toggle like (tất cả role)
router.put("/:id/like", protect, toggleLike);

// ─── Comments ─────────────────────────────────────────────────────────────────
// POST   /api/learning-materials/:id/comments              → Thêm comment (tất cả)
// DELETE /api/learning-materials/:id/comments/:commentId  → Xóa comment
router.post("/:id/comments", protect, addComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);

// ─── Archive (Admin only) ─────────────────────────────────────────────────────
// PATCH /api/learning-materials/:id/archive
router.patch("/:id/archive", protect, authorize("Administrator"), toggleArchive);

export default router;