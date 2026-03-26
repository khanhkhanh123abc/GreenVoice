import mongoose from "mongoose";

const learningMaterialSchema = new mongoose.Schema(
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
    // "Academic" do Academic Staff đăng, "Support" do Support Staff đăng
    materialType: {
      type: String,
      enum: ["Academic", "Support"],
      required: [true, "Material type is required"],
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    // File đính kèm (tên file lưu trong uploads/)
    documents: [{ type: String }],
    // Lượt xem
    views: { type: Number, default: 0 },
    // Like
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Comments
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    // Trạng thái bài viết
    status: {
      type: String,
      enum: ["published", "archived"],
      default: "published",
    },
  },
  { timestamps: true }
);

export default mongoose.model("LearningMaterial", learningMaterialSchema);