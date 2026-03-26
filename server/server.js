import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// Import các Routes
import authRoutes from "./routes/auth.js";
import ideaRoutes from "./routes/ideas.js";
import categoryRoutes from "./routes/categories.js";
import userRoutes from "./routes/user.js";
import attendanceRoutes from "./routes/attendance.js";
import analyticsRoutes from "./routes/analytics.js";
import notificationRoutes from "./routes/notifications.js";
import learningMaterialRoutes from "./routes/learningMaterials.js";
import reportRoutes from "./routes/reports.js";
import campaignRoutes from "./routes/campaign.js";
import classRoutes from "./routes/classes.js";



import { createServer } from "http";
import { Server } from "socket.io";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Cổng mặc định của React Vite
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
})

io.on("connection", (socket) => {
  console.log("🟢 Một thiết bị đã kết nối Real-time:", socket.id);

  // Khi Frontend gửi ID lên, đưa user đó vào 1 "phòng" riêng biệt
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

// Middleware
app.use(cors());
app.use(express.json());

// Cấu hình để có thể xem được ảnh/file upload từ trình duyệt
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Khai báo các API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/ideas", ideaRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/user", userRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/learning-materials", learningMaterialRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/classes", classRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Kết nối MongoDB và Khởi chạy Server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT} with WebSockets 🚀`);
    });
  })
  .catch((err) => console.log("Mongo error:", err));