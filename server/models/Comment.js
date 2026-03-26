import mongoose from "mongoose";

/**
 * Comment model – theo Class Diagram
 * Fields: commentID (auto _id), ideaId, authorId, content, isAnonymous, createdAt
 * Methods: post(), edit(), delete()  →  implemented in commentController.js
 */
const commentSchema = new mongoose.Schema(
  {
    ideaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Idea",
      required: [true, "Idea reference is required"],
      index: true,                // tìm comment theo idea nhanh hơn
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author reference is required"],
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true } // createdAt + updatedAt tự động
);

export default mongoose.model("Comment", commentSchema);