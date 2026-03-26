import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  // Mốc 1: Hạn chót nộp Idea mới (Sau ngày này cấm nộp thêm bài, cấm sửa bài)
  closureDate: { 
    type: Date, 
    required: true 
  },
  // Mốc 2: Hạn chót tương tác (Sau ngày này cấm Comment, cấm Like)
  finalClosureDate: { 
    type: Date, 
    required: true 
  },
  // Ai là người tạo chiến dịch này? (QAManager hoặc Admin)
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  // Công tắc khẩn cấp (Phòng trường hợp Admin muốn đóng chiến dịch ngay lập tức)
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

export default mongoose.model("Campaign", campaignSchema);