import Idea from "../models/Idea.js";
import Document from "../models/Document.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { moderateContent, shouldBlock } from "../utils/aiModeration.js";

// ═══════════════════════════════════════════════════════════════
//  CREATE  –  POST /api/ideas
// ═══════════════════════════════════════════════════════════════
export const createIdea = async (req, res) => {
  try {
    const { title, content, topicType, categoryId, isAnonymous, campaignId } = req.body;
    const author = req.user;
    const files = req.files;

    if (!author.termsAgreed) {
      return res.status(403).json({ message: "You must agree to the Terms and Conditions before submitting an idea." });
    }
    if (author.role === "Support Staff" && topicType === "Academic") {
      return res.status(403).json({ message: "Support Staff can only post to Support topics." });
    }

    // AI + Keyword moderation (logic nằm hoàn toàn trong utils/aiModeration.js)
    const moderation = await moderateContent(title, content, topicType);

    if (shouldBlock(moderation)) {
      return res.status(400).json({
        message: "Your idea was flagged by our content moderation system and could not be submitted.",
        reason: moderation.reason,
        aiDecision: "rejected",
      });
    }

    const ideaStatus = moderation.autoApproved ? "approved" : "pending";
    const documentPaths = files ? files.map(f => f.filename) : [];

    const idea = await Idea.create({
      title, content, topicType, categoryId, campaignId,
      authorId: author._id,
      isAnonymous: isAnonymous === "true" || isAnonymous === true,
      documents: documentPaths,
      status: ideaStatus,
      aiModeration: {
        decision:     moderation.decision,
        confidence:   moderation.confidence,
        reason:       moderation.reason,
        autoApproved: moderation.autoApproved,
        checkedAt:    new Date(),
        scores:       moderation.scores,
      },
    });

    req.io.emit("analyticsUpdate");

    res.status(201).json({
      success: true,
      message: moderation.autoApproved
        ? "Your idea has been submitted and auto-approved! 🎉"
        : "Your idea has been submitted and is pending review by QA Coordinator.",
      idea,
      aiModeration: {
        autoApproved: moderation.autoApproved,
        decision:     moderation.decision,
        reason:       moderation.reason,
        scores:       moderation.scores,
        status:       ideaStatus,
      },
    });

    // Notify QAC in background
    try {
      const qacList = await User.find({ role: "QA Coordinator" }).select("_id");
      const authorName = (isAnonymous === "true" || isAnonymous === true) ? "Anonymous" : author.name;
      const aiTag   = moderation.autoApproved ? "✅ Auto-approved" : "⏳ Pending review";
      const scoreStr = moderation.scores ? ` [Score: ${moderation.scores.finalScore}/100]` : "";
      const msg = `💡 ${authorName} posted: "${title}" [${aiTag}]${scoreStr}`;
      for (const qac of qacList) {
        const notif = await Notification.create({
          recipientId: qac._id, senderName: author.name,
          ideaId: idea._id, type: "idea", message: msg,
        });
        req.io.to(qac._id.toString()).emit("notification", {
          ...notif.toObject(), _id: notif._id.toString(), ideaId: notif.ideaId?.toString() || null,
        });
      }
    } catch (e) { console.error("Notification error:", e.message); }

  } catch (error) {
    console.error("CREATE IDEA ERROR:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ═══════════════════════════════════════════════════════════════
//  READ ALL  –  GET /api/ideas
//  BUG FIX: dùng $and để tránh $or status bị ghi đè khi có search
// ═══════════════════════════════════════════════════════════════
export const getAllIdeas = async (req, res) => {
  try {
    const { topicType, page = 1, limit = 10, search, category, sortBy, author, status } = req.query;
    const role = req.user?.role;
    const isReviewer = ["QA Coordinator", "QA Manager", "Administrator"].includes(role);

    const andConditions = [];

    // Tất cả role (kể cả QAC/Admin) chỉ thấy approved ở home/search
    // NGOẠI LỆ: Staff/Student xem My Ideas (author = chính mình) → thấy cả pending của mình
    const userId = req.user._id?.toString() || req.user.id?.toString();
    const isMyIdeas = author && author === userId && !isReviewer;

    if (isMyIdeas) {
      // My Ideas: thấy approved + pending của chính mình
      andConditions.push({ $or: [
        { status: "approved" },
        { status: "pending" },
        { status: { $exists: false } },
        { status: null },
      ]});
    } else {
      // Home / Search / bất kỳ ai khác → chỉ approved
      andConditions.push({ $or: [
        { status: "approved" },
        { status: { $exists: false } },
        { status: null },
      ]});
    }

    if (author)   andConditions.push({ authorId: author });
    if (topicType) andConditions.push({ topicType });
    if (category && category !== "All Categories") andConditions.push({ categoryId: category });
    if (search) {
      andConditions.push({ $or: [
        { title:   { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
      ]});
    }

    const filter = andConditions.length > 0 ? { $and: andConditions } : {};

    let sortOption = { createdAt: -1 };
    if (sortBy === "popular")  sortOption = { votes: -1, createdAt: -1 };
    else if (sortBy === "viewed")   sortOption = { views: -1, createdAt: -1 };
    else if (sortBy === "comments") sortOption = { reactions: -1, createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const ideas = await Idea.find(filter)
      .populate({ path: "authorId", select: "name email role" })
      .populate({ path: "campaignId", select: "name" })
      .sort(sortOption).skip(skip).limit(Number(limit));

    const masked = ideas.map(idea => {
      const obj = idea.toObject();
      if (obj.isAnonymous && role !== "Administrator") obj.authorId = { name: "Anonymous", email: null, role: null };
      return obj;
    });

    const total = await Idea.countDocuments(filter);
    res.json({ ideas: masked, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  READ ONE  –  GET /api/ideas/:id
// ═══════════════════════════════════════════════════════════════
export const getIdeaById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid idea ID" });
    const role = req.user?.role;
    const isReviewer = ["QA Coordinator", "QA Manager", "Administrator"].includes(role);

    const idea = await Idea.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true })
      .populate({ path: "authorId", select: "name email role" })
      .populate({ path: "campaignId", select: "name" })
      .populate({ path: "comments", populate: { path: "authorId", select: "name role" } });

    if (!idea) return res.status(404).json({ message: "Idea not found" });

    // Ẩn pending/rejected với người không phải reviewer (trừ chính tác giả)
    if (!isReviewer && idea.status === "pending" && idea.authorId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "This idea is pending review." });
    }
    if (!isReviewer && idea.status === "rejected" && idea.authorId._id.toString() !== req.user._id.toString()) {
      return res.status(404).json({ message: "Idea not found" });
    }

    const obj = idea.toObject();
    if (obj.isAnonymous && role !== "Administrator") obj.authorId = { name: "Anonymous", email: null, role: null };
    if (obj.comments && role !== "Administrator") {
      obj.comments = obj.comments.map(c => {
        if (c.isAnonymous) c.authorId = { _id: c.authorId._id, name: "Anonymous", role: null };
        return c;
      });
    }
    res.json(obj);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  GET PENDING IDEAS  –  GET /api/ideas/pending
// ═══════════════════════════════════════════════════════════════
export const getPendingIdeas = async (req, res) => {
  try {
    const ideas = await Idea.find({ status: "pending" })
      .populate({ path: "authorId", select: "name email role department" })
      .populate({ path: "campaignId", select: "name" })
      .sort({ createdAt: -1 });
    res.json({ ideas });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  REVIEW IDEA  –  PATCH /api/ideas/:id/review
//  Reject = ẩn khỏi feed, KHÔNG xóa
// ═══════════════════════════════════════════════════════════════
export const reviewIdea = async (req, res) => {
  try {
    const { action, note } = req.body;
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
    }
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: "Idea not found" });
    if (idea.status !== "pending") return res.status(400).json({ message: "This idea is not pending review" });

    idea.status     = action === "approve" ? "approved" : "rejected";
    idea.reviewNote = note || "";
    idea.reviewedBy = req.user._id;
    idea.reviewedAt = new Date();
    await idea.save();

    const authorMsg = action === "approve"
      ? `✅ Your idea "${idea.title}" has been approved by QA!`
      : `❌ Your idea "${idea.title}" was not approved. Note: ${note || "No reason provided"}`;

    await Notification.create({
      recipientId: idea.authorId, senderName: req.user.name,
      ideaId: idea._id, type: "idea", message: authorMsg,
    });
    req.io.to(idea.authorId.toString()).emit("notification", { message: authorMsg });
    req.io.emit("analyticsUpdate");

    res.json({
      success: true,
      message: action === "approve"
        ? "Idea approved successfully"
        : "Idea rejected — hidden from public feed but not deleted",
      idea,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  UPDATE  –  PUT /api/ideas/:id
// ═══════════════════════════════════════════════════════════════
export const updateIdea = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid idea ID" });
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: "Idea not found" });
    if (idea.authorId.toString() !== req.user._id.toString()) return res.status(403).json({ message: "Not authorized" });
    if (idea.closureDate && new Date() > new Date(idea.closureDate)) return res.status(403).json({ message: "This idea is closed." });
    const { title, content, topicType, isAnonymous, closureDate } = req.body;
    const updated = await Idea.findByIdAndUpdate(req.params.id,
      { title, content, topicType, isAnonymous, closureDate },
      { returnDocument: "after", runValidators: true }
    );
    res.json({ message: "Idea updated successfully", idea: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  DELETE  –  DELETE /api/ideas/:id
// ═══════════════════════════════════════════════════════════════
export const deleteIdea = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid idea ID" });
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: "Idea not found" });
    if (idea.authorId.toString() !== req.user._id.toString() && req.user.role !== "Administrator") {
      return res.status(403).json({ message: "Not authorized" });
    }
    await Document.deleteMany({ ideaId: idea._id });
    await idea.deleteOne();
    req.io.emit("analyticsUpdate");
    res.json({ message: "Idea deleted successfully." });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  ADD COMMENT
// ═══════════════════════════════════════════════════════════════
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isAnonymous } = req.body;
    const idea = await Idea.findById(id);
    if (!idea) return res.status(404).json({ message: "Idea not found" });
    const comment = new Comment({ ideaId: id, authorId: req.user._id, content, isAnonymous: isAnonymous || false });
    await comment.save();
    idea.comments.push(comment._id);
    idea.reactions += 1;
    await idea.save();
    const populatedComment = await Comment.findById(comment._id).populate("authorId", "name role");
    req.io.emit("global_update_comments", { ideaId: id, commentCount: idea.comments.length, newComment: populatedComment });
    if (idea.authorId.toString() !== req.user._id.toString()) {
      const name = isAnonymous ? "Một người dùng ẩn danh" : req.user.name;
      const msg  = `💬 ${name} vừa bình luận vào bài "${idea.title}" của bạn!`;
      const notif = await Notification.create({ recipientId: idea.authorId, senderName: name, ideaId: idea._id, type: "comment", message: msg });
      req.io.to(idea.authorId.toString()).emit("notification", { ...notif.toObject(), _id: notif._id.toString(), ideaId: notif.ideaId.toString() });
    }
    req.io.emit("analyticsUpdate");
    res.status(201).json(populatedComment);
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ═══════════════════════════════════════════════════════════════
//  TOGGLE LIKE
// ═══════════════════════════════════════════════════════════════
export const toggleLike = async (req, res) => {
  try {
    const idea = await Idea.findById(req.params.id);
    if (!idea) return res.status(404).json({ message: "Không tìm thấy bài viết" });
    const isLiked = idea.likes.includes(req.user._id);
    if (isLiked) await Idea.updateOne({ _id: idea._id }, { $pull: { likes: req.user._id } });
    else         await Idea.updateOne({ _id: idea._id }, { $addToSet: { likes: req.user._id } });
    const updated = await Idea.findById(req.params.id);
    res.json(updated.likes);
  } catch (error) { res.status(500).json({ message: error.message }); }
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
    await Idea.findByIdAndUpdate(id, { $pull: { comments: commentId }, $inc: { reactions: -1 } });
    res.json({ success: true, message: "Comment deleted" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
