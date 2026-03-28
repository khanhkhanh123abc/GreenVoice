import mongoose from "mongoose";

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

    // Ngày bắt đầu mở nhận ideas (null = mở ngay khi tạo)
    openDate: {
      type: Date,
      default: null,
    },

    // Hạn chót nộp ideas (null = không giới hạn)
    closureDate: {
      type: Date,
      default: null,
    },

    // Người tạo topic
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);