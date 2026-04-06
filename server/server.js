import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import ideaRoutes from "./routes/ideas.js";
import categoryRoutes from "./routes/categories.js";
import userRoutes from "./routes/user.js";
import attendanceRoutes from "./routes/attendance.js";
import notificationRoutes from "./routes/notifications.js";
import learningMaterialRoutes from "./routes/learningMaterials.js";
import reportRoutes from "./routes/reports.js";
import campaignRoutes from "./routes/campaign.js";
import classRoutes from "./routes/classes.js";
import analyticsRoutes from "./routes/analytics.js";
import aiRoutes from "./routes/ai.js";     
import { startDailyStatsCronJob } from "./jobs/dailyTopicStats.js";

import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 Một thiết bị đã kết nối Real-time:", socket.id);

  socket.on("joinUserRoom", (userId) => {
    socket.join(userId);
    console.log(`👤 User ${userId} đã bật kênh nhận thông báo cá nhân`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Thiết bị đã ngắt kết nối:", socket.id);
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/ideas", ideaRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/user", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/learning-materials", learningMaterialRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/ai", aiRoutes);    

app.get("/", (req, res) => {
  res.send("API is running...");
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    startDailyStatsCronJob(); // ← Khởi động cron job
    const PORT = process.env.PORT || 5001;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT} with WebSockets 🚀`);
    });
  })
  .catch((err) => console.log("Mongo error:", err));