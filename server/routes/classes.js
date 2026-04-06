import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
  getMyClasses,
  getClassMembers,
  submitFeedback,
  getFeedbackByClass,
  getMyReceivedFeedback,
  getMySubmittedFeedback,
  getAllFeedback,
} from "../controllers/classController.js";

const router = express.Router();

// ─── FEEDBACK SPECIAL ROUTES (trước :id để tránh conflict) ───────────────────
// GET  /api/classes/feedback/my-received   → Academic Staff xem feedback nhận được
router.get(
  "/feedback/my-received",
  protect,
  authorize("Academic Staff"),
  getMyReceivedFeedback
);

// GET  /api/classes/feedback/all  → QAC + Admin xem toàn bộ feedback hệ thống
router.get(
  "/feedback/all",
  protect,
  authorize("QA Coordinator", "Administrator"),
  getAllFeedback
);

// GET  /api/classes/feedback/my-submitted  → Student xem feedback đã gửi
router.get(
  "/feedback/my-submitted",
  protect,
  authorize("Student"),
  getMySubmittedFeedback
);

// ─── MY CLASSES (Student) ─────────────────────────────────────────────────────
// GET  /api/classes/my-classes  → Student xem danh sách lớp của mình
router.get("/my-classes", protect, authorize("Student"), getMyClasses);

// ─── ADMIN CRUD ───────────────────────────────────────────────────────────────
// GET  /api/classes
// POST /api/classes
router
  .route("/")
  .get(protect, authorize("Administrator", "QA Manager", "QA Coordinator", "Academic Staff", "Support Staff"), getAllClasses)
  .post(protect, authorize("Administrator", "QA Coordinator"), createClass);

// GET    /api/classes/:id
// PUT    /api/classes/:id
// DELETE /api/classes/:id
router
  .route("/:id")
  .get(protect, getClassById)
  .put(protect, authorize("Administrator", "QA Coordinator"), updateClass)
  .delete(protect, authorize("Administrator", "QA Coordinator"), deleteClass);

// ─── MEMBERS ─────────────────────────────────────────────────────────────────
// GET /api/classes/:id/members  → Student + Staff + Admin xem thành viên lớp
router.get("/:id/members", protect, getClassMembers);

// ─── STUDENT MANAGEMENT ───────────────────────────────────────────────────────
// POST   /api/classes/:id/students           → Admin thêm student vào lớp
// DELETE /api/classes/:id/students/:studentId → Admin xóa student khỏi lớp
router.post(
  "/:id/students",
  protect,
  authorize("Administrator", "QA Coordinator"),
  addStudentToClass
);
router.delete(
  "/:id/students/:studentId",
  protect,
  authorize("Administrator", "QA Coordinator"),
  removeStudentFromClass
);

// ─── FEEDBACK ─────────────────────────────────────────────────────────────────
// POST /api/classes/:id/feedback  → Student gửi feedback
// GET  /api/classes/:id/feedback  → Xem feedback của lớp
router
  .route("/:id/feedback")
  .post(protect, authorize("Student"), submitFeedback)
  .get(
    protect,
    authorize("Student", "Academic Staff", "Administrator", "QA Manager", "QA Coordinator"),
    getFeedbackByClass
  );

export default router;