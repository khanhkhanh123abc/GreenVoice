import LearningMaterial from "../models/LearningMaterial.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { moderateContent, shouldBlock } from "../utils/aiModeration.js";

// ═══════════════════════════════════════════════════════════════
//  CREATE
// ═══════════════════════════════════════════════════════════════
export const createMaterial = async (req, res) => {
  try {
    const { title, content, materialType, categoryId } = req.body;
    const author = req.user;
    const files  = req.files;

    if (author.role === "Academic Staff" && materialType !== "Academic") {
      return res.status(403).json({ message: "Academic Staff can only post Academic learning materials." });
    }
    if (author.role === "Support Staff" && materialType !== "Support") {
      return res.status(403).json({ message: "Support Staff can only post Support learning materials." });
    }

    // AI + Keyword moderation — dùng chung engine từ utils/aiModeration.js
    const moderation = await moderateContent(title, content, materialType);

    if (shouldBlock(moderation)) {
      return res.status(400).json({
        message: "Your material was flagged by our content moderation system.",
        reason: moderation.reason,
        aiDecision: "rejected",
      });
    }

    const reviewStatus  = moderation.autoApproved ? "approved" : "pending";
    const documentPaths = files ? files.map(f => f.filename) : [];

    const material = await LearningMaterial.create({
      title, content, materialType,
      categoryId: categoryId || null,
      authorId:   author._id,
      documents:  documentPaths,
      status:     "published",
      reviewStatus,
      aiModeration: {
        decision:     moderation.decision,
        confidence:   moderation.confidence,
        reason:       moderation.reason,
        autoApproved: moderation.autoApproved,
        checkedAt:    new Date(),
        scores:       moderation.scores,
      },
    });

    res.status(201).json({
      success: true,
      message: moderation.autoApproved
        ? "Material submitted and auto-approved! 🎉"
        : "Material submitted and is pending QA review.",
      material,
      aiModeration: {
        autoApproved: moderation.autoApproved,
        decision:     moderation.decision,
        reason:       moderation.reason,
        scores:       moderation.scores,
        reviewStatus,
      },
    });

    // Notify QAC if pending
    if (!moderation.autoApproved) {
      try {
        const qacList = await User.find({ role: "QA Coordinator" }).select("_id");
        const scoreStr = moderation.scores ? ` [Score: ${moderation.scores.finalScore}/100]` : "";
        const msg = `📚 ${author.name} uploaded: "${title}" [⏳ Pending review]${scoreStr}`;
        for (const qac of qacList) {
          const notif = await Notification.create({
            recipientId: qac._id, senderName: author.name,
            ideaId: material._id, type: "idea", message: msg,
          });
          req.io.to(qac._id.toString()).emit("notification", {
            ...notif.toObject(), _id: notif._id.toString(),
          });
        }
      } catch (e) { console.error("Notify error:", e.message); }
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  READ ALL
// ═══════════════════════════════════════════════════════════════
export const getAllMaterials = async (req, res) => {
  try {
    const { materialType, page = 1, limit = 10, status, author } = req.query;
    const role       = req.user?.role;
    const isReviewer = ["QA Coordinator", "QA Manager", "Administrator"].includes(role);

    const filter = {};
    if (materialType) filter.materialType = materialType;
    if (author)       filter.authorId = author;

    // Published/archived filter
    if (status && role === "Administrator") filter.status = status;
    else filter.status = "published";

    // Tất cả role chỉ thấy approved ở trang LM
    // NGOẠI LỆ: Staff xem material của chính mình → thấy cả pending
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const isMyMaterials = author && author === userId && !isReviewer;

    if (isMyMaterials) {
      filter.$or = [
        { reviewStatus: "approved" },
        { reviewStatus: "pending" },
        { reviewStatus: { $exists: false } },
        { reviewStatus: null },
      ];
    } else {
      // Tất cả trường hợp còn lại → chỉ approved
      filter.$or = [
        { reviewStatus: "approved" },
        { reviewStatus: { $exists: false } },
        { reviewStatus: null },
      ];
    }

    const skip      = (Number(page) - 1) * Number(limit);
    const materials = await LearningMaterial.find(filter)
      .populate({ path: "authorId",   select: "name email role" })
      .populate({ path: "categoryId", select: "name" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await LearningMaterial.countDocuments(filter);
    res.json({ materials, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  GET PENDING
// ═══════════════════════════════════════════════════════════════
export const getPendingMaterials = async (req, res) => {
  try {
    const materials = await LearningMaterial.find({ reviewStatus: "pending" })
      .populate({ path: "authorId",   select: "name email role department" })
      .populate({ path: "categoryId", select: "name" })
      .sort({ createdAt: -1 });
    res.json({ materials, total: materials.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  REVIEW MATERIAL  —  Reject = ẩn, KHÔNG xóa
// ═══════════════════════════════════════════════════════════════
export const reviewMaterial = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
    }
    const material = await LearningMaterial.findById(req.params.id);
    if (!material)                          return res.status(404).json({ message: "Material not found" });
    if (material.reviewStatus !== "pending") return res.status(400).json({ message: "This material is not pending review" });

    material.reviewStatus = action === "approve" ? "approved" : "rejected";
    material.reviewNote   = note || "";
    material.reviewedBy   = req.user._id;
    material.reviewedAt   = new Date();
    await material.save();

    const authorMsg = action === "approve"
      ? `✅ Your material "${material.title}" has been approved!`
      : `❌ Your material "${material.title}" was not approved. Note: ${note || "No reason provided"}`;

    await Notification.create({
      recipientId: material.authorId, senderName: req.user.name,
      ideaId: material._id, type: "idea", message: authorMsg,
    });
    req.io.to(material.authorId.toString()).emit("notification", { message: authorMsg });

    res.json({
      success: true,
      message: action === "approve" ? "Material approved" : "Material rejected — hidden from public but not deleted",
      material,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  READ ONE
// ═══════════════════════════════════════════════════════════════
export const getMaterialById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid material ID" });
    const material = await LearningMaterial.findByIdAndUpdate(
      req.params.id, { $inc: { views: 1 } }, { returnDocument: "after" }
    )
      .populate({ path: "authorId",   select: "name email role" })
      .populate({ path: "categoryId", select: "name" })
      .populate({ path: "comments",   populate: { path: "authorId", select: "name role" } });
    if (!material) return res.status(404).json({ message: "Learning material not found" });
    res.json(material);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  UPDATE
// ═══════════════════════════════════════════════════════════════
export const updateMaterial = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid material ID" });
    const material = await LearningMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Learning material not found" });
    if (material.authorId.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });
    const { title, content, categoryId } = req.body;
    const updated = await LearningMaterial.findByIdAndUpdate(
      req.params.id, { title, content, categoryId },
      { returnDocument: "after", runValidators: true }
    );
    res.json({ message: "Learning material updated successfully", material: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════════════════════
export const deleteMaterial = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid material ID" });
    const material = await LearningMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Learning material not found" });
    if (material.authorId.toString() !== req.user._id.toString() && req.user.role !== "Administrator") {
      return res.status(403).json({ message: "Not authorized" });
    }
    await material.deleteOne();
    res.json({ message: "Learning material deleted successfully." });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  TOGGLE LIKE
// ═══════════════════════════════════════════════════════════════
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId  = req.user._id;
    const material = await LearningMaterial.findById(id);
    if (!material) return res.status(404).json({ message: "Learning material not found" });
    const isLiked = material.likes.includes(userId);
    if (isLiked) {
      material.likes = material.likes.filter(lid => lid.toString() !== userId.toString());
    } else {
      material.likes.push(userId);
      if (material.authorId.toString() !== userId.toString()) {
        const msg   = `❤️ ${req.user.name} liked your material "${material.title}"`;
        const notif = await Notification.create({ recipientId: material.authorId, senderName: req.user.name, ideaId: material._id, type: "like", message: msg });
        req.io.to(material.authorId.toString()).emit("notification", notif);
      }
    }
    await material.save();
    req.io.emit("global_update_material_likes", { materialId: id, likes: material.likes });
    res.json({ message: isLiked ? "Unliked" : "Liked", likesCount: material.likes.length, likes: material.likes });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  ADD COMMENT
// ═══════════════════════════════════════════════════════════════
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isAnonymous } = req.body;
    const material = await LearningMaterial.findById(id);
    if (!material) return res.status(404).json({ message: "Learning material not found" });
    const comment = new Comment({ ideaId: id, authorId: req.user._id, content, isAnonymous: isAnonymous || false });
    await comment.save();
    material.comments.push(comment._id);
    await material.save();
    const populated = await Comment.findById(comment._id).populate("authorId", "name role");
    req.io.emit("global_update_material_comments", { materialId: id, commentCount: material.comments.length, newComment: populated });
    if (material.authorId.toString() !== req.user._id.toString()) {
      const name  = isAnonymous ? "An anonymous user" : req.user.name;
      const msg   = `💬 ${name} commented on your material "${material.title}"`;
      const notif = await Notification.create({ recipientId: material.authorId, senderName: name, ideaId: material._id, type: "comment", message: msg });
      req.io.to(material.authorId.toString()).emit("notification", notif);
    }
    res.status(201).json(populated);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  DELETE COMMENT
// ═══════════════════════════════════════════════════════════════
export const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.authorId.toString() !== req.user._id.toString() && req.user.role !== "Administrator") {
      return res.status(403).json({ message: "Not authorized" });
    }
    await comment.deleteOne();
    await LearningMaterial.findByIdAndUpdate(id, { $pull: { comments: commentId } });
    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  TOGGLE ARCHIVE
// ═══════════════════════════════════════════════════════════════
export const toggleArchive = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid material ID" });
    const material = await LearningMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Learning material not found" });
    material.status = material.status === "published" ? "archived" : "published";
    await material.save();
    res.json({ message: "Material is now " + material.status, status: material.status });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
