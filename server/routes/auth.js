import express from "express";
import { register, login, getProfile, updateProfile, agreeToTerms } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Đăng ký và Đăng nhập
router.post("/register", register);
router.post("/login", login);

// Thông tin cá nhân (Profile)
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// Đồng ý điều khoản (Sử dụng PUT để cập nhật trạng thái)
router.put("/agree-terms", protect, agreeToTerms);

export default router;