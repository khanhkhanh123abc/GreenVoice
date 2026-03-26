import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  role:        {
    type: String,
    enum: ["Student", "Academic Staff", "Support Staff", "QA Coordinator", "QA Manager", "Administrator"],
    default: "Student"
  },
  department:  { type: String },
  termsAgreed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("User", userSchema);