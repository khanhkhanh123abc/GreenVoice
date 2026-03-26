import mongoose from "mongoose";

const classSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  academicStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }]

}, { timestamps: true });

export default mongoose.model("Class", classSchema);