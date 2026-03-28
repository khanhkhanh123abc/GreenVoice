import express from "express";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  deleteCategory,
} from "../controllers/categoryController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect,
  //authorize("Administrator", "QA Manager", "QA Coordinator", "Academic Staff", "Support Staff"),
  getAllCategories);

router.get("/:id", protect,
  authorize("Administrator", "QA Manager", "QA Coordinator", "Academic Staff", "Support Staff"),
  getCategoryById);

// QA Coordinator cũng được tạo topic
router.post("/", protect,
  authorize("QA Coordinator", "QA Manager", "Administrator"),
  createCategory);

router.delete("/:id", protect,
  authorize("QA Manager", "Administrator"),
  deleteCategory);

export default router;