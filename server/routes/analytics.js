import express from 'express';
import { protect } from '../middleware/auth.js';
import Idea from '../models/Idea.js';
import Comment from '../models/Comment.js';

const router = express.Router();

// GET /api/analytics/summary
router.get('/summary', protect, async (req, res) => {
  try {
    const totalIdeas = await Idea.countDocuments();
    const totalComments = await Comment.countDocuments();
    
    // Tính tổng lượt xem
    const ideas = await Idea.find({}, 'views topicType');
    const totalViews = ideas.reduce((sum, item) => sum + (item.views || 0), 0);

    // Dữ liệu cho biểu đồ
    const academicCount = ideas.filter(i => i.topicType === 'Academic').length;
    const supportCount = ideas.filter(i => i.topicType === 'Support').length;

    const categoryData = [
      { name: 'Academic', value: academicCount },
      { name: 'Support', value: supportCount },
    ];

    res.json({
      summary: { totalIdeas, totalComments, totalViews },
      categoryData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;