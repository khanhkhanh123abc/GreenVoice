import express from 'express';
import { protect } from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// 1. Get 20 most recent notifications
router.get('/', protect, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipientId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        const result = notifications.map(n => ({
            ...n,
            _id:      n._id.toString(),
            ideaId:   n.ideaId?.toString()   || null,
            reportId: n.reportId?.toString() || null,
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2. Mark as read when notification is clicked
router.put('/:id/read', protect, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;