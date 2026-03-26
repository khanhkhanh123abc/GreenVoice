import LearningMaterial from "../models/LearningMaterial.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
//  CREATE  –  POST /api/learning-materials
//  Chỉ Academic Staff và Support Staff được đăng
// ─────────────────────────────────────────────
export const createMaterial = async (req, res) => {
  try {
    const { title, content, materialType, categoryId } = req.body;
    const author = req.user;
    const files = req.files;

    // Rule: Academic Staff chỉ được đăng loại "Academic"
    if (author.role === "Academic Staff" && materialType !== "Academic") {
      return res.status(403).json({
        message: "Academic Staff can only post Academic learning materials.",
      });
    }

    // Rule: Support Staff chỉ được đăng loại "Support"
    if (author.role === "Support Staff" && materialType !== "Support") {
      return res.status(403).json({
        message: "Support Staff can only post Support learning materials.",
      });
    }

    const documentPaths = files ? files.map((f) => f.filename) : [];

    const material = await LearningMaterial.create({
      title,
      content,
      materialType,
      categoryId: categoryId || null,
      authorId: author._id,
      documents: documentPaths,
    });

    res.status(201).json({
      success: true,
      message: "Learning material created successfully",
      material,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────
//  READ ALL  –  GET /api/learning-materials
//  Tất cả các role đã đăng nhập đều xem được
// ─────────────────────────────────────────────
export const getAllMaterials = async (req, res) => {
  try {
    const { materialType, page = 1, limit = 10, status } = req.query;
    const filter = {};
    if (materialType) filter.materialType = materialType;
    // Mặc định chỉ show bài published, Admin có thể xem cả archived
    if (status && req.user.role === "Administrator") {
      filter.status = status;
    } else {
      filter.status = "published";
    }

    const skip = (Number(page) - 1) * Number(limit);
    const materials = await LearningMaterial.find(filter)
      .populate({ path: "authorId", select: "name email role" })
      .populate({ path: "categoryId", select: "name" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await LearningMaterial.countDocuments(filter);
    res.json({
      materials,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  READ ONE  –  GET /api/learning-materials/:id
// ─────────────────────────────────────────────
export const getMaterialById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid material ID" });
    }

    const material = await LearningMaterial.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { returnDocument: "after" }
    )
      .populate({ path: "authorId", select: "name email role" })
      .populate({ path: "categoryId", select: "name" })
      .populate({
        path: "comments",
        populate: { path: "authorId", select: "name role" },
      });

    if (!material) {
      return res.status(404).json({ message: "Learning material not found" });
    }

    res.json(material);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  UPDATE  –  PUT /api/learning-materials/:id
//  Chỉ tác giả (Academic Staff / Support Staff) được sửa
// ─────────────────────────────────────────────
export const updateMaterial = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid material ID" });
    }

    const material = await LearningMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: "Learning material not found" });
    }

    if (material.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to update this material." });
    }

    const { title, content, categoryId } = req.body;

    const updated = await LearningMaterial.findByIdAndUpdate(
      req.params.id,
      { title, content, categoryId },
      { returnDocument: "after", runValidators: true }
    );

    res.json({ message: "Learning material updated successfully", material: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  DELETE  –  DELETE /api/learning-materials/:id
//  Tác giả hoặc Admin được xóa
// ─────────────────────────────────────────────
export const deleteMaterial = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid material ID" });
    }

    const material = await LearningMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: "Learning material not found" });
    }

    const isOwner = material.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "Administrator";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You are not authorized to delete this material." });
    }

    await material.deleteOne();
    res.json({ message: "Learning material deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  TOGGLE LIKE  –  PUT /api/learning-materials/:id/like
//  Tất cả role đều like được
// ─────────────────────────────────────────────
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const material = await LearningMaterial.findById(id);
    if (!material) return res.status(404).json({ message: "Learning material not found" });

    const isLiked = material.likes.includes(userId);

    if (isLiked) {
      material.likes = material.likes.filter((lid) => lid.toString() !== userId.toString());
    } else {
      material.likes.push(userId);

      // Thông báo cho tác giả
      if (material.authorId.toString() !== userId.toString()) {
        const msg = `❤️ ${req.user.name} đã thích tài liệu "${material.title}" của bạn!`;
        const newNotif = await Notification.create({
          recipientId: material.authorId,
          senderName: req.user.name,
          ideaId: material._id, // dùng chung field ideaId để lưu ref
          type: "like",
          message: msg,
        });
        req.io.to(material.authorId.toString()).emit("notification", newNotif);
      }
    }

    await material.save();

    req.io.emit("global_update_material_likes", {
      materialId: id,
      likes: material.likes,
    });

    res.json({
      message: isLiked ? "Unliked" : "Liked",
      likesCount: material.likes.length,
      likes: material.likes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
//  ADD COMMENT  –  POST /api/learning-materials/:id/comments
//  Tất cả role đều comment được
// ─────────────────────────────────────────────
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isAnonymous } = req.body;

    const material = await LearningMaterial.findById(id);
    if (!material) return res.status(404).json({ message: "Learning material not found" });

    const comment = new Comment({
      ideaId: id, // Comment model dùng ideaId làm ref chung
      authorId: req.user._id,
      content,
      isAnonymous: isAnonymous || false,
    });
    await comment.save();

    material.comments.push(comment._id);
    await material.save();

    const populated = await Comment.findById(comment._id).populate("authorId", "name role");

    req.io.emit("global_update_material_comments", {
      materialId: id,
      commentCount: material.comments.length,
      newComment: populated,
    });

    // Thông báo tác giả
    if (material.authorId.toString() !== req.user._id.toString()) {
      const commenterName = isAnonymous ? "Một người dùng ẩn danh" : req.user.name;
      const msg = `💬 ${commenterName} vừa bình luận vào tài liệu "${material.title}" của bạn!`;
      const newNotif = await Notification.create({
        recipientId: material.authorId,
        senderName: commenterName,
        ideaId: material._id,
        type: "comment",
        message: msg,
      });
      req.io.to(material.authorId.toString()).emit("notification", newNotif);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
//  DELETE COMMENT  –  DELETE /api/learning-materials/:id/comments/:commentId
// ─────────────────────────────────────────────
export const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const isOwner = comment.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "Administrator";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You are not authorized to delete this comment." });
    }

    await comment.deleteOne();
    await LearningMaterial.findByIdAndUpdate(id, { $pull: { comments: commentId } });

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
//  ARCHIVE / RESTORE  –  PATCH /api/learning-materials/:id/archive
//  Chỉ Admin
// ─────────────────────────────────────────────
export const toggleArchive = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid material ID" });
    }

    const material = await LearningMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Learning material not found" });

    material.status = material.status === "published" ? "archived" : "published";
    await material.save();

    res.json({ message: `Material is now ${material.status}`, status: material.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};