import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  classes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    default: null
  }]

}, { timestamps: true });

export default mongoose.model("StudentProfile", studentProfileSchema);