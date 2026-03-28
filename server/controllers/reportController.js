import Report from "../models/Report.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { sendEmail, buildReportNotificationEmail } from "../utils/emailService.js";

// ─────────────────────────────────────────────
//  CREATE REPORT  –  POST /api/reports
// ─────────────────────────────────────────────
export const createReport = async (req, res) => {
  try {
    const { title, content, type, targetId } = req.body;
    const sender = req.user;

    const report = await Report.create({
      title,
      content,
      type,
      targetId: targetId || null,
      senderId: sender._id,
    });

    // Gửi thông báo real-time cho tất cả Admin
    const admins = await User.find({ role: "Administrator" }).select("_id name email");

    const msg = `📋 QAC ${sender.name} vừa gửi một report mới: "${title}"`;

    for (const admin of admins) {
      const notif = await Notification.create({
        recipientId: admin._id,
        senderName: sender.name,
        ideaId: report._id,
        type: "report",
        message: msg,
      });
      const notif1Plain = { ...notif.toObject(), _id: notif._id.toString(), ideaId: notif.ideaId?.toString() || null };
      req.io.to(admin._id.toString()).emit("notification", notif1Plain);
    }

    // ───── Gửi Email cho tất cả Admin ─────
    if (admins.length > 0) {
      const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
      const reportLink = `${CLIENT_URL}/reports`;

      const emailPromises = admins.map((admin) => {
        const { subject, html } = buildReportNotificationEmail({
          adminName: admin.name,
          qacName: sender.name,
          qacEmail: sender.email,
          reportTitle: title,
          reportType: type || "Chung",
          reportContent: content,
          reportLink,
        });
        return sendEmail(admin.email, subject, html).catch((err) =>
          console.error(`⚠️ Không thể gửi mail cho admin ${admin.email}:`, err.message)
        );
      });

      Promise.all(emailPromises).then(() =>
        console.log(`✅ Đã gửi email thông báo report mới cho ${admins.length} admin.`)
      );
    }

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      report,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────
//  GET ALL REPORTS  –  GET /api/reports
// ─────────────────────────────────────────────
export const getAllReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (req.user.role === "QA Coordinator") {
      filter.senderId = req.user._id;
    }

    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const reports = await Report.find(filter)
      .populate({ path: "senderId", select: "name email role" })
      .populate({ path: "resolvedBy", select: "name email role" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Report.countDocuments(filter);

    res.json({
      reports,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  GET ONE REPORT  –  GET /api/reports/:id
// ─────────────────────────────────────────────
export const getReportById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await Report.findById(req.params.id)
      .populate({ path: "senderId", select: "name email role" })
      .populate({ path: "resolvedBy", select: "name email role" });

    if (!report) return res.status(404).json({ message: "Report not found" });

    if (
      req.user.role === "QA Coordinator" &&
      report.senderId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  APPROVE REPORT  –  PATCH /api/reports/:id/approve
// ─────────────────────────────────────────────
export const approveReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (report.status !== "pending") {
      return res.status(400).json({ message: `Report is already ${report.status}` });
    }

    const { adminNote } = req.body;

    report.status = "approved";
    report.adminNote = adminNote || "";
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    const msg = `✅ Report "${report.title}" của bạn đã được Admin duyệt.${adminNote ? ` Ghi chú: ${adminNote}` : ""}`;
    const notif = await Notification.create({
      recipientId: report.senderId,
      senderName: req.user.name,
      ideaId: report._id,
      type: "report",
      message: msg,
    });
    const notif2Plain = { ...notif.toObject(), _id: notif._id.toString(), ideaId: notif.ideaId?.toString() || null };
      req.io.to(report.senderId.toString()).emit("notification", notif2Plain);

    res.json({ message: "Report approved", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  REJECT REPORT  –  PATCH /api/reports/:id/reject
// ─────────────────────────────────────────────
export const rejectReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (report.status !== "pending") {
      return res.status(400).json({ message: `Report is already ${report.status}` });
    }

    const { adminNote } = req.body;

    report.status = "rejected";
    report.adminNote = adminNote || "";
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    await report.save();

    const msg = `❌ Report "${report.title}" của bạn đã bị Admin từ chối.${adminNote ? ` Lý do: ${adminNote}` : ""}`;
    const notif = await Notification.create({
      recipientId: report.senderId,
      senderName: req.user.name,
      ideaId: report._id,
      type: "report",
      message: msg,
    });
    req.io.to(report.senderId.toString()).emit("notification", notif);

    res.json({ message: "Report rejected", report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  DELETE REPORT  –  DELETE /api/reports/:id
// ─────────────────────────────────────────────
export const deleteReport = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid report ID" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    const isOwner = report.senderId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "Administrator";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (isOwner && !isAdmin && report.status !== "pending") {
      return res.status(403).json({ message: "Cannot delete a report that has already been processed." });
    }

    await report.deleteOne();
    res.json({ message: "Report deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};