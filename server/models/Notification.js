import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderName:  { type: String, required: true },
    ideaId:      { type: mongoose.Schema.Types.ObjectId, default: null }, // not required — report notifications don't have an ideaId
    reportId:    { type: mongoose.Schema.Types.ObjectId, default: null }, // for report notifications
    type:        { type: String, enum: ["like", "comment", "report", "idea"], required: true },
    message:     { type: String, required: true },
    isRead:      { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);