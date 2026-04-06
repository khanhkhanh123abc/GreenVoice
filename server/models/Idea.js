import mongoose from "mongoose";

const ideaSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, "Title is required"], trim: true, maxlength: [200, "Title cannot exceed 200 characters"] },
    content: { type: String, required: [true, "Content is required"], trim: true },
    topicType: { type: String, enum: ["Academic", "Support"], required: [true, "Topic type is required"] },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isAnonymous: { type: Boolean, default: false },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
    views:     { type: Number, default: 0 },
    votes:     { type: Number, default: 0 },
    reactions: { type: Number, default: 0 },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
    documents: [{ type: String }],
    comments:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
    likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ── Review status ─────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewNote:  { type: String, default: "" },
    reviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt:  { type: Date, default: null },

    // ── AI Moderation result ──────────────────────────────────
    aiModeration: {
      decision:     { type: String, enum: ["approve", "review"], default: "review" },
      confidence:   { type: Number, default: 0 },
      reason:       { type: String, default: "" },
      autoApproved: { type: Boolean, default: false },
      checkedAt:    { type: Date },
      // Rubric scores
      scores: {
        constructiveness: { type: Number, default: null },
        feasibility:      { type: Number, default: null },
        relevance:        { type: Number, default: null },
        professionalism:  { type: Number, default: null },
        totalScore:       { type: Number, default: null },
        whitelistBoost:   { type: Number, default: null },
        finalScore:       { type: Number, default: null },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Idea", ideaSchema);
