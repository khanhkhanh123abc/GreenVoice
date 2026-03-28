import Category from "../models/Category.js";
import Idea from "../models/Idea.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { sendEmail, buildNewTopicEmail } from "../utils/emailService.js";

// ─────────────────────────────────────────────
//  CREATE  –  POST /api/categories
// ─────────────────────────────────────────────
export const createCategory = async (req, res) => {
  try {
    const { name, description, openDate, closureDate } = req.body;
    const creator = req.user;

    const existing = await Category.findOne({ name: name?.trim() });
    if (existing) {
      return res.status(400).json({ message: "Category name already exists." });
    }

    const category = await Category.create({
      name,
      description,
      openDate: openDate ? new Date(openDate) : new Date(), // Mặc định mở ngay
      closureDate: closureDate ? new Date(closureDate) : null,
      createdBy: creator._id,
    });

    // ───── Gửi Email thông báo cho tất cả Staff ─────
    const staffUsers = await User.find({
      role: { $in: ["Academic Staff", "Support Staff"] },
    }).select("name email");

    if (staffUsers.length > 0) {
      const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
      const topicLink = `${CLIENT_URL}/ideas?category=${category._id}`;

      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      };

      const emailPromises = staffUsers.map((staff) => {
        const { subject, html } = buildNewTopicEmail({
          staffName: staff.name,
          topicName: category.name,
          topicDescription: category.description,
          creatorName: creator.name,
          openDate: formatDate(category.openDate),
          closureDate: formatDate(category.closureDate),
          topicLink,
        });
        return sendEmail(staff.email, subject, html).catch((err) =>
          console.error(`⚠️ Không thể gửi mail cho ${staff.email}:`, err.message)
        );
      });

      // Fire-and-forget: không block response
      Promise.all(emailPromises).then(() =>
        console.log(`✅ Đã gửi email thông báo topic mới "${category.name}" cho ${staffUsers.length} staff.`)
      );
    }

    res.status(201).json({
      message: "Category created successfully",
      category,
      emailsSent: staffUsers.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  READ ALL  –  GET /api/categories
// ─────────────────────────────────────────────
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  READ ONE + TẤT CẢ IDEAS THUỘC CATEGORY ĐÓ
//  GET /api/categories/:id
// ─────────────────────────────────────────────
export const getCategoryById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const ideas = await Idea.find({ categoryId: category._id })
      .populate({ path: "authorId", select: "name email role" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const maskedIdeas = ideas.map((idea) => {
      const obj = idea.toObject();
      if (obj.isAnonymous && req.user?.role !== "Administrator") {
        obj.authorId = { name: "Anonymous", email: null, role: null };
      }
      return obj;
    });

    const total = await Idea.countDocuments({ categoryId: category._id });

    res.json({
      category,
      ideas: maskedIdeas,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  DELETE  –  DELETE /api/categories/:id
// ─────────────────────────────────────────────
export const deleteCategory = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await Idea.updateMany({ categoryId: category._id }, { $set: { categoryId: null } });
    await category.deleteOne();

    res.json({ message: "Category deleted. Related ideas have been unlinked." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};