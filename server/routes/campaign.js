import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { createCampaign, getAllCampaigns, getActiveCampaigns } from '../controllers/campaignController.js';

const router = express.Router();

// 1. API cho Staff: Lấy danh sách chiến dịch đang mở (Ai đăng nhập cũng gọi được)
// LƯU Ý: Phải đặt /active lên trước /
router.get('/active', protect, getActiveCampaigns);

// 2. API cho Quản lý: Lấy tất cả và Tạo mới (Chỉ Admin/QA Manager mới có quyền)
router.get('/', protect, authorize("Administrator", "QA Manager"), getAllCampaigns);
router.post('/', protect, authorize("Administrator", "QA Manager"), createCampaign);

export default router;