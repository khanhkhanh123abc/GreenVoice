import express from 'express';
import { protect } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// 1. Lấy 20 thông báo gần nhất của mình
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipientId: req.user._id })
            .sort({ createdAt: -1 }) // Mới nhất xếp lên đầu
            .limit(20); 
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2. Đánh dấu đã đọc khi click vào thông báo
router.put('/:id/read', protect, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;