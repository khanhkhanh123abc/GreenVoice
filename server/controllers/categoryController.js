import Category from "../models/Category.js";
import Idea from "../models/Idea.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
//  CREATE  –  POST /api/categories
//  Chỉ Administrator hoặc QA Manager mới tạo được
// ─────────────────────────────────────────────
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const existing = await Category.findOne({ name: name?.trim() });
    if (existing) {
      return res.status(400).json({ message: "Category name already exists." });
    }

    const category = await Category.create({ name, description });
    res.status(201).json({ message: "Category created successfully", category });
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

    // Lấy tất cả ideas thuộc category này
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const ideas = await Idea.find({ categoryId: category._id })
      .populate({ path: "authorId", select: "name email role" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Ẩn tác giả nếu ý kiến ẩn danh (trừ Admin)
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
//  Chỉ Administrator mới xoá được
//  Ideas thuộc category sẽ có categoryId = null
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

    // Unlink tất cả ideas: set categoryId về null
    await Idea.updateMany({ categoryId: category._id }, { $set: { categoryId: null } });

    await category.deleteOne();

    res.json({ message: "Category deleted. Related ideas have been unlinked." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};