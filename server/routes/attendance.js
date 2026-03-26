import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getAttendanceByDate, updateAttendance,getMyAttendance } from '../controllers/attendanceController.js';

const router = express.Router();

// Chỉ Admin hoặc QA Manager mới có quyền vào điểm danh Staff
router.get('/my-records', protect, getMyAttendance);
router.get('/:date', protect, authorize("Administrator", "QA Manager"), getAttendanceByDate);
router.put('/:date', protect, authorize("Administrator", "QA Manager"), updateAttendance);

export default router;