import mongoose from "mongoose";

const ideaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      trim: true,
    },
    topicType: {
      type: String,
      enum: ["Academic", "Support"],
      required: [true, "Topic type is required"],
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true
    },
    views: {
      type: Number,
      default: 0,
    },
    votes: {
      type: Number,
      default: 0,
    },
    reactions: {
      type: Number,
      default: 0,
    },
    // Category (1 idea thuộc 1 category)
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    // Documents: Lưu danh sách tên file (String) thay vì ObjectId
    documents: [
      {
        type: String,
      },
    ],

    // Comments: Móc nối với bảng Comment
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],

    // Likes: Danh sách ID người dùng đã thả tim
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Idea", ideaSchema);