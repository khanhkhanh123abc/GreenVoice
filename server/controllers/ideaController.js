import Idea from "../models/Idea.js";
import Document from "../models/Document.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";

// ─────────────────────────────────────────────
//  CREATE  –  POST /api/ideas
// ─────────────────────────────────────────────
export const createIdea = async (req, res) => {
  try {
    const { title, content, topicType, categoryId, isAnonymous, campaignId } = req.body;
    const author = req.user;
    const files = req.files;

    // Rule: Phải đồng ý điều khoản
    if (!author.termsAgreed) {
      return res.status(403).json({
        message: "You must agree to the Terms and Conditions before submitting an idea.",
      });
    }

    // Rule: Support Staff không được đăng bài Academic
    if (author.role === "Support Staff" && topicType === "Academic") {
      return res.status(403).json({
        message: "Support Staff can only post to Support topics.",
      });
    }

    // Xử lý File đính kèm
    const documentPaths = files ? files.map(file => file.filename) : [];

    const idea = await Idea.create({
      title,
      content,
      topicType,
      categoryId,
      campaignId: campaignId,
      authorId: author._id,
      isAnonymous: isAnonymous === 'true' || isAnonymous === true,
      documents: documentPaths,
    });

    req.io.emit("analyticsUpdate");
    res.status(201).json({ success: true, message: "Idea created successfully", idea });
  } catch (error) {
    console.error("LỖI KHI TẠO IDEA:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ─────────────────────────────────────────────
//  READ ALL  –  GET /api/ideas (ĐÃ NÂNG CẤP LỌC & SẮP XẾP)
// ─────────────────────────────────────────────
export const getAllIdeas = async (req, res) => {
  try {
    const { topicType, page = 1, limit = 10, search, category, sortBy, author } = req.query;
    const filter = {};

    if (author) filter.authorId = author;

    // 1. Lọc theo Topic Type
    if (topicType) filter.topicType = topicType;

    // 2. Lọc theo Category
    if (category && category !== "All Categories") {
      filter.categoryId = category;
    }

    // 3. Tìm kiếm Text (Search query)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } }
      ];
    }

    // 4. Xử lý các Tab Sắp xếp (Sort)
    let sortOption = { createdAt: -1 }; // Mặc định: Latest (Mới nhất)

    if (sortBy === "popular") {
      sortOption = { votes: -1, createdAt: -1 }; // Most Popular: Nhiều tim nhất
    } else if (sortBy === "viewed") {
      sortOption = { views: -1, createdAt: -1 }; // Most Viewed: Xem nhiều nhất
    } else if (sortBy === "latest") {
      sortOption = { createdAt: -1 }; // Latest Ideas: Mới tạo nhất
    } else if (sortBy === "comments") {
      sortOption = { reactions: -1, createdAt: -1 }; // Latest Comments: Nhiều tương tác nhất
    }

    const skip = (Number(page) - 1) * Number(limit);

    const ideas = await Idea.find(filter)
      .populate({ path: "authorId", select: "name email role" })
      .populate({ path: "campaignId", select: "name" })
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const masked = ideas.map((idea) => {
      const obj = idea.toObject();
      if (obj.isAnonymous && req.user?.role !== "Administrator") {
        obj.authorId = { name: "Anonymous", email: null, role: null };
      }
      return obj;
    });

    const total = await Idea.countDocuments(filter);
    res.json({
      ideas: masked,
      pagination: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  READ ONE  –  GET /api/ideas/:id
// ─────────────────────────────────────────────
export const getIdeaById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid idea ID" });
    }

    const idea = await Idea.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    )
      .populate({ path: "authorId", select: "name email role" })
      .populate({ path: "campaignId", select: "name" })
      .populate({
        path: "comments",
        populate: { path: "authorId", select: "name role" },
      });

    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    const obj = idea.toObject();

    // Ẩn danh tác giả bài viết
    if (obj.isAnonymous && req.user?.role !== "Administrator") {
      obj.authorId = { name: "Anonymous", email: null, role: null };
    }

    // Ẩn danh tác giả của từng comment
    if (obj.comments && req.user?.role !== "Administrator") {
      obj.comments = obj.comments.map(comment => {
        if (comment.isAnonymous) {
          comment.authorId = {
            _id: comment.authorId._id,
            name: "Anonymous",
            role: null
          };
        }
        return comment;
      });
    }

    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  UPDATE  –  PUT /api/ideas/:id
// ─────────────────────────────────────────────
export const updateIdea = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid idea ID" });
    }

    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    if (idea.authorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to update this idea." });
    }

    if (idea.closureDate && new Date() > new Date(idea.closureDate)) {
      return res.status(403).json({ message: "This idea is closed and can no longer be edited." });
    }

    const { title, content, topicType, isAnonymous, closureDate } = req.body;

    const updated = await Idea.findByIdAndUpdate(
      req.params.id,
      { title, content, topicType, isAnonymous, closureDate },
      { returnDocument: 'after', runValidators: true }
    );

    res.json({ message: "Idea updated successfully", idea: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  DELETE  –  DELETE /api/ideas/:id
// ─────────────────────────────────────────────
export const deleteIdea = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid idea ID" });
    }

    const idea = await Idea.findById(req.params.id);
    if (!idea) {
      return res.status(404).json({ message: "Idea not found" });
    }

    const isOwner = idea.authorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "Administrator";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "You are not authorized to delete this idea." });
    }

    await Document.deleteMany({ ideaId: idea._id });
    await idea.deleteOne();

    req.io.emit("analyticsUpdate");
    res.json({ message: "Idea and related documents deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────
//  ADD COMMENT  –  POST /api/ideas/:id/comments
// ─────────────────────────────────────────────
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isAnonymous } = req.body;

    const idea = await Idea.findById(id);
    if (!idea) return res.status(404).json({ message: "Idea not found" });

    // 1. Tạo bình luận mới
    const comment = new Comment({
      ideaId: id,
      authorId: req.user._id,
      content,
      isAnonymous: isAnonymous || false
    });
    await comment.save();

    // 2. Thêm bình luận vào Idea và cập nhật DB
    idea.comments.push(comment._id);
    idea.reactions += 1;
    await idea.save();

    // Lấy thông tin đầy đủ của comment để Frontend render được luôn
    const populatedComment = await Comment.findById(comment._id).populate("authorId", "name role");

    // 🚀 PHÁT SÓNG REAL-TIME (SOCKET.IO) 🚀
    req.io.emit("global_update_comments", {
      ideaId: id,
      commentCount: idea.comments.length,
      newComment: populatedComment
    });

    // B. THÔNG BÁO CÁ NHÂN: Chỉ gửi cho tác giả bài viết
    if (idea.authorId.toString() !== req.user._id.toString()) {
      const commenterName = isAnonymous ? "Một người dùng ẩn danh" : req.user.name;
      const msg = `💬 ${commenterName} vừa bình luận vào bài viết "${idea.title}" của bạn!`;

      const newNotif = await Notification.create({
        recipientId: idea.authorId,
        senderName: commenterName,
        ideaId: idea._id,
        type: 'comment',
        message: msg
      });

      const notifPlain = {
        ...newNotif.toObject(),
        _id:    newNotif._id.toString(),
        ideaId: newNotif.ideaId.toString(),
      };
      req.io.to(idea.authorId.toString()).emit("notification", notifPlain);
    }
    req.io.emit("analyticsUpdate");
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
//  TOGGLE LIKE  –  PUT /api/ideas/:id/like
// ─────────────────────────────────────────────
export const toggleLike = async (req, res) => {
    try {
        const idea = await Idea.findById(req.params.id);
        if (!idea) {
            return res.status(404).json({ message: "Không tìm thấy bài viết" });
        }

        // Kiểm tra xem ID của user đã có trong mảng likes chưa
        const isLiked = idea.likes.includes(req.user._id);

        if (isLiked) {
            // Nếu đã Like rồi -> Bỏ Like ($pull: Rút ID ra khỏi mảng)
            await Idea.updateOne(
                { _id: idea._id }, 
                { $pull: { likes: req.user._id } }
            );
        } else {
            // Nếu chưa Like -> Thêm Like ($addToSet: Thêm vào nhưng tuyệt đối KHÔNG cho trùng lặp)
            await Idea.updateOne(
                { _id: idea._id }, 
                { $addToSet: { likes: req.user._id } }
            );
        }

        // Lấy lại danh sách Like mới nhất để gửi về cho Frontend hiển thị
        const updatedIdea = await Idea.findById(req.params.id);
        res.json(updatedIdea.likes);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────
//  DELETE COMMENT  –  DELETE /api/ideas/:id/comments/:commentId
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

    await Idea.findByIdAndUpdate(id, {
      $pull: { comments: commentId },
      $inc: { reactions: -1 }
    });

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};