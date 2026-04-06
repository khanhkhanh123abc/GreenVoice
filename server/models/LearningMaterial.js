import mongoose from "mongoose";

const learningMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: [200, "Title cannot exceed 200 characters"] },
    content: { type: String, required: [true, "Content is required"], trim: true },
    materialType: { type: String, enum: ["Academic", "Support"], required: [true, "Material type is required"] },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    documents: [{ type: String }],
    views: { type: Number, default: 0 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],

    // published/archived — dùng cho archive toggle (giữ nguyên)
    status: { type: String, enum: ["published", "archived"], default: "published" },

    // ── Review status (mới) ──────────────────────────────────
    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewNote: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },

    // ── AI Moderation (mới) ──────────────────────────────────
    aiModeration: {
      decision:     { type: String, enum: ["approve", "review"], default: "review" },
      confidence:   { type: Number, default: 0 },
      reason:       { type: String, default: "" },
      autoApproved: { type: Boolean, default: false },
      checkedAt:    { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.model("LearningMaterial", learningMaterialSchema);
