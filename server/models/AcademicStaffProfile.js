import mongoose from "mongoose";

const staffProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },

  classesManaged: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class"
  }]

}, { timestamps: true });

export default mongoose.model("StaffProfile", staffProfileSchema);