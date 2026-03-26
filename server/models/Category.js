import mongoose from "mongoose";

/**
 * Category model
 * Quan hệ:
 *   - 1 Category  →  nhiều Idea  (reference bên Idea: categoryId)
 *   - 1 Idea      →  1 Category
 */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Category name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);