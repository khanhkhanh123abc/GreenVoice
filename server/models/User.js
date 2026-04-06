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
  phone:       {
    type: String,
    validate: {
      validator: v => !v || /^0\d{9}$/.test(v),
      message: "Phone must start with 0 and be exactly 10 digits."
    }
  },
  termsAgreed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("User", userSchema);