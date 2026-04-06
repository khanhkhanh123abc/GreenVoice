import Class from "../models/Class.js";
import User from "../models/User.js";
import StudentProfile from "../models/StudentProfile.js";
import StaffProfile from "../models/AcademicStaffProfile.js";
import Feedback from "../models/Feedback.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

// ──────────────────────────────────────────────────────────────
//  ADMIN – CRUD Class
// ──────────────────────────────────────────────────────────────

// GET /api/classes  → Lấy tất cả lớp (Admin)
export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate("academicStaff", "name email department")
      .populate("students", "name email department");

    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/classes/:id  → Xem chi tiết 1 lớp
export const getClassById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid class ID" });
    }

    const cls = await Class.findById(req.params.id)
      .populate("academicStaff", "name email department")
      .populate("students", "name email department");

    if (!cls) return res.status(404).json({ message: "Class not found" });

    res.json({ success: true, class: cls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/classes  → Tạo lớp mới (Admin)
export const createClass = async (req, res) => {
  try {
    const { name, academicStaffId } = req.body;

    // Validate staff nếu có
    if (academicStaffId) {
      const staff = await User.findById(academicStaffId);
      if (!staff || staff.role !== "Academic Staff") {
        return res.status(400).json({ message: "Invalid Academic Staff ID" });
      }
    }

    const cls = await Class.create({
      name,
      academicStaff: academicStaffId || null,
      students: [],
    });

    // Cập nhật StaffProfile nếu có gán staff
    if (academicStaffId) {
      await StaffProfile.findOneAndUpdate(
        { user: academicStaffId },
        { $addToSet: { classesManaged: cls._id } },
        { upsert: true }
      );
    }

    const populated = await Class.findById(cls._id)
      .populate("academicStaff", "name email department")
      .populate("students", "name email department");

    res.status(201).json({ success: true, class: populated });

    // ── Notify: Admin notifies QAC, QAC notifies Admin ──
    try {
      const sender = req.user;
      const isAdmin = sender.role === "Administrator";
      // Notify the opposite role group
      const targetRole = isAdmin ? "QA Coordinator" : "Administrator";
      const targets = await User.find({ role: targetRole }).select("_id");
      const msg = `🏫 ${sender.name} (${sender.role}) vừa tạo lớp mới: "${name}"`;
      for (const target of targets) {
        const notif = await Notification.create({
          recipientId: target._id,
          senderName: sender.name,
          type: "idea", // reuse existing type
          ideaId: cls._id, // store classId here for navigation
          message: msg,
        });
        req.io.to(target._id.toString()).emit("notification", {
          ...notif.toObject(),
          _id: notif._id.toString(),
        });
      }
    } catch (notifErr) {
      console.error("Class create notification error:", notifErr.message);
    }

    // ── Notify assigned staff ──
    if (academicStaffId) {
      try {
        const msg = `🏫 Bạn đã được phân công dạy lớp: "${name}" bởi ${req.user.name}`;
        const notif = await Notification.create({
          recipientId: academicStaffId,
          senderName: req.user.name,
          type: "idea",
          ideaId: cls._id,
          message: msg,
        });
        req.io.to(academicStaffId.toString()).emit("notification", {
          ...notif.toObject(), _id: notif._id.toString(),
        });
      } catch (e) { console.error("Staff assign notification error:", e.message); }
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/classes/:id  → Sửa lớp (Admin)
export const updateClass = async (req, res) => {
  try {
    const { name, academicStaffId } = req.body;
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    // Nếu đổi staff, cập nhật StaffProfile
    if (academicStaffId !== undefined) {
      const oldStaffId = cls.academicStaff?.toString();

      if (oldStaffId && oldStaffId !== academicStaffId) {
        // Xóa lớp khỏi staff cũ
        await StaffProfile.findOneAndUpdate(
          { user: oldStaffId },
          { $pull: { classesManaged: cls._id } }
        );
      }

      if (academicStaffId) {
        const staff = await User.findById(academicStaffId);
        if (!staff || staff.role !== "Academic Staff") {
          return res.status(400).json({ message: "Invalid Academic Staff ID" });
        }
        await StaffProfile.findOneAndUpdate(
          { user: academicStaffId },
          { $addToSet: { classesManaged: cls._id } },
          { upsert: true }
        );
      }

      cls.academicStaff = academicStaffId || null;
    }

    if (name) cls.name = name;
    await cls.save();

    const populated = await Class.findById(cls._id)
      .populate("academicStaff", "name email department")
      .populate("students", "name email department");

    res.json({ success: true, class: populated });

    // ── Notify opposite role ──
    try {
      const sender = req.user;
      const targetRole = sender.role === "Administrator" ? "QA Coordinator" : "Administrator";
      const targets = await User.find({ role: targetRole }).select("_id");
      const msg = `✏️ ${sender.name} (${sender.role}) vừa cập nhật lớp: "${cls.name}"`;
      for (const target of targets) {
        const notif = await Notification.create({
          recipientId: target._id, senderName: sender.name, type: "idea", ideaId: cls._id, message: msg,
        });
        req.io.to(target._id.toString()).emit("notification", { ...notif.toObject(), _id: notif._id.toString() });
      }
    } catch (e) { console.error("Class update notification error:", e.message); }

    // ── Notify newly assigned staff ──
    if (academicStaffId && academicStaffId !== cls.academicStaff?.toString()) {
      try {
        const msg = `🏫 Bạn đã được phân công dạy lớp: "${cls.name}" bởi ${req.user.name}`;
        const notif = await Notification.create({
          recipientId: academicStaffId,
          senderName: req.user.name,
          type: "idea",
          ideaId: cls._id,
          message: msg,
        });
        req.io.to(academicStaffId.toString()).emit("notification", {
          ...notif.toObject(), _id: notif._id.toString(),
        });
      } catch (e) { console.error("Staff assign notification error:", e.message); }
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/classes/:id  → Xóa lớp (Admin)
export const deleteClass = async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    // Xóa khỏi StaffProfile
    if (cls.academicStaff) {
      await StaffProfile.findOneAndUpdate(
        { user: cls.academicStaff },
        { $pull: { classesManaged: cls._id } }
      );
    }

    // Xóa khỏi StudentProfile tất cả học sinh
    await StudentProfile.updateMany(
      { classes: cls._id },
      { $pull: { classes: cls._id } }
    );

    await cls.deleteOne();
    res.json({ success: true, message: "Class deleted" });

    // ── Notify opposite role ──
    try {
      const sender = req.user;
      const targetRole = sender.role === "Administrator" ? "QA Coordinator" : "Administrator";
      const targets = await User.find({ role: targetRole }).select("_id");
      const msg = `🗑️ ${sender.name} (${sender.role}) vừa xóa lớp: "${cls.name}"`;
      for (const target of targets) {
        const notif = await Notification.create({
          recipientId: target._id, senderName: sender.name, type: "idea", message: msg,
        });
        req.io.to(target._id.toString()).emit("notification", { ...notif.toObject(), _id: notif._id.toString() });
      }
    } catch (e) { console.error("Class delete notification error:", e.message); }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
//  ADMIN – Quản lý học sinh trong lớp
// ──────────────────────────────────────────────────────────────

// POST /api/classes/:id/students  → Thêm student vào lớp
export const addStudentToClass = async (req, res) => {
  try {
    const { studentId } = req.body;

    const student = await User.findById(studentId);
    if (!student || student.role !== "Student") {
      return res.status(400).json({ message: "Invalid Student ID" });
    }

    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    if (cls.students.includes(studentId)) {
      return res.status(400).json({ message: "Student already in this class" });
    }

    cls.students.push(studentId);
    await cls.save();

    // Cập nhật StudentProfile
    await StudentProfile.findOneAndUpdate(
      { user: studentId },
      { $addToSet: { classes: cls._id } },
      { upsert: true }
    );

    const populated = await Class.findById(cls._id)
      .populate("academicStaff", "name email department")
      .populate("students", "name email department");

    res.json({ success: true, class: populated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/classes/:id/students/:studentId  → Xóa student khỏi lớp
export const removeStudentFromClass = async (req, res) => {
  try {
    const { id: classId, studentId } = req.params;

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    cls.students = cls.students.filter((s) => s.toString() !== studentId);
    await cls.save();

    // Cập nhật StudentProfile
    await StudentProfile.findOneAndUpdate(
      { user: studentId },
      { $pull: { classes: cls._id } }
    );

    res.json({ success: true, message: "Student removed from class" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
//  STUDENT – Xem lớp của mình
// ──────────────────────────────────────────────────────────────

// GET /api/classes/my-classes  → Student xem danh sách lớp của mình
export const getMyClasses = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id });

    if (!profile || profile.classes.length === 0) {
      return res.json({ success: true, classes: [] });
    }

    const classes = await Class.find({ _id: { $in: profile.classes } })
      .populate("academicStaff", "name email department")
      .populate("students", "name email department");

    res.json({ success: true, classes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/classes/:id/members  → Xem danh sách học sinh + staff trong lớp
// Student chỉ xem được lớp mình đang học
export const getClassMembers = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid class ID" });
    }

    const cls = await Class.findById(req.params.id)
      .populate("academicStaff", "name email department role")
      .populate("students", "name email department role");

    if (!cls) return res.status(404).json({ message: "Class not found" });

    // Nếu là Student, kiểm tra có trong lớp không
    if (req.user.role === "Student") {
      const isMember = cls.students.some(
        (s) => s._id.toString() === req.user._id.toString()
      );
      if (!isMember) {
        return res
          .status(403)
          .json({ message: "You are not a member of this class" });
      }
    }

    res.json({ success: true, class: cls });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ──────────────────────────────────────────────────────────────
//  FEEDBACK
// ──────────────────────────────────────────────────────────────

// POST /api/classes/:id/feedback  → Student gửi feedback cho staff của lớp
export const submitFeedback = async (req, res) => {
  try {
    const { id: classId } = req.params;
    const { rating, comment } = req.body;

    if (req.user.role !== "Student") {
      return res.status(403).json({ message: "Only students can submit feedback" });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Kiểm tra student có trong lớp không
    const cls = await Class.findById(classId).populate("academicStaff", "name");
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const isMember = cls.students.some(
      (s) => s.toString() === req.user._id.toString()
    );
    if (!isMember) {
      return res
        .status(403)
        .json({ message: "You are not a member of this class" });
    }

    if (!cls.academicStaff) {
      return res
        .status(400)
        .json({ message: "This class has no assigned Academic Staff" });
    }

    // Period: YYYY-MM của thời điểm hiện tại
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Kiểm tra đã feedback tháng này chưa
    const existing = await Feedback.findOne({
      studentId: req.user._id,
      staffId: cls.academicStaff._id,
      period,
    });

    if (existing) {
      return res.status(400).json({
        message: `You have already submitted feedback for this staff this month (${period})`,
      });
    }

    const feedback = await Feedback.create({
      studentId: req.user._id,
      staffId: cls.academicStaff._id,
      classId,
      rating,
      comment: comment || "",
      period,
    });

    const populated = await Feedback.findById(feedback._id)
      .populate("studentId", "name email")
      .populate("staffId", "name email department")
      .populate("classId", "name");

    res.status(201).json({ success: true, feedback: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "You have already submitted feedback for this staff this month",
      });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET /api/classes/:id/feedback  → Xem feedback của lớp
// Student xem của mình, Academic Staff xem của mình, Admin xem tất cả
export const getFeedbackByClass = async (req, res) => {
  try {
    const { id: classId } = req.params;

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    let filter = { classId };

    if (req.user.role === "Student") {
      // Student chỉ xem feedback của mình
      filter.studentId = req.user._id;
    } else if (req.user.role === "Academic Staff") {
      // Staff chỉ xem feedback về mình
      filter.staffId = req.user._id;
    }
    // Admin/QA xem tất cả

    const feedbacks = await Feedback.find(filter)
      .populate("studentId", "name email")
      .populate("staffId", "name email department")
      .sort({ createdAt: -1 });

    res.json({ success: true, feedbacks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/classes/feedback/my-received  → Academic Staff xem tất cả feedback nhận được
export const getMyReceivedFeedback = async (req, res) => {
  try {
    if (req.user.role !== "Academic Staff") {
      return res.status(403).json({ message: "Only Academic Staff can view received feedback" });
    }

    const feedbacks = await Feedback.find({ staffId: req.user._id })
      .populate("studentId", "name email")
      .populate("classId", "name")
      .sort({ createdAt: -1 });

    // Tính điểm trung bình
    const avgRating =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
        : 0;

    res.json({
      success: true,
      feedbacks,
      stats: {
        total: feedbacks.length,
        avgRating: Math.round(avgRating * 10) / 10,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/classes/feedback/all  → QAC / Admin xem toàn bộ feedback của hệ thống
export const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find()
      .populate("studentId", "name email")
      .populate("staffId", "name email")
      .populate("classId", "name")
      .sort({ createdAt: -1 });

    const avgRating =
      feedbacks.length > 0
        ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
        : 0;

    res.json({
      success: true,
      feedbacks,
      stats: {
        total: feedbacks.length,
        avgRating: Math.round(avgRating * 10) / 10,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/classes/feedback/my-submitted  → Student xem tất cả feedback đã gửi
export const getMySubmittedFeedback = async (req, res) => {
  try {
    if (req.user.role !== "Student") {
      return res.status(403).json({ message: "Only Students can view submitted feedback" });
    }

    const feedbacks = await Feedback.find({ studentId: req.user._id })
      .populate("staffId", "name email department")
      .populate("classId", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, feedbacks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};