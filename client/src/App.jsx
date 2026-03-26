import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function RoleRedirect() {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role === "Student") return <Navigate to="/my-classes" replace />;
  return <Navigate to="/ideas" replace />;
}

// Import thư viện Socket và Toast
import { io } from "socket.io-client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import các trang (Pages)
import Login from "./pages/Login";
import Register from "./pages/Register";
import Ideas from "./pages/Ideas";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import SubmitIdea from "./pages/SubmitIdea";
import IdeaDetail from "./pages/IdeaDetail";
import Users from "./pages/Users";
import LearningMaterials from "./pages/LearningMaterials";
import LearningMaterialDetail from "./pages/LearningMaterialDetail";
import Reports from "./pages/Reports";
import MyAttendance from "./pages/MyAttendance";
import MyIdeas from "./pages/MyIdeas";
import Campaigns from "./pages/Campaigns";
import UserManagement from "./pages/UserManagement";


// Import Dashboard pages
import SystemOverview from "./pages/dashboards/SystemOverview";
import TeachingQuality from "./pages/dashboards/TeachingQuality";
import StaffContribution from "./pages/dashboards/StaffContribution";
import IdeaEngagement from "./pages/dashboards/IdeaEngagement";
import StaffPerformance from "./pages/dashboards/StaffPerformance";

import Attendance from "./pages/Attendance";
import MyClasses from "./pages/MyClasses";
import ClassDetail from "./pages/ClassDetail";
import ClassManagement from "./pages/ClassManagement";
import FeedbackReceived from "./pages/FeedbackReceived";

const QA = ["QA Manager", "Administrator"];
const ADMIN = ["Administrator"];

// Khởi tạo Socket
export const socket = io("http://localhost:5000", {
  autoConnect: false,
});

function SocketManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      socket.connect();
      const userId = user._id || user.id;
      socket.emit("joinUserRoom", userId);

      socket.on("notification", (data) => {
        toast.info(data.message, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme: "light",
          icon: "🔔",
        });
      });
    } else {
      socket.disconnect();
    }

    return () => {
      socket.off("notification");
    };
  }, [user]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SocketManager />
        <ToastContainer />

        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route path="/ideas" element={
            <ProtectedRoute allowedRoles={['Academic Staff','Support Staff','QA Coordinator','QA Manager','Administrator']}>
              <Ideas />
            </ProtectedRoute>
          } />
          <Route path="/ideas/:id" element={
            <ProtectedRoute allowedRoles={['Academic Staff','Support Staff','QA Coordinator','QA Manager','Administrator']}>
              <IdeaDetail />
            </ProtectedRoute>
          } />
          <Route path="/submit-idea" element={<ProtectedRoute><SubmitIdea /></ProtectedRoute>} />
          <Route path="/submit" element={<ProtectedRoute><SubmitIdea /></ProtectedRoute>} />
          <Route path="/my-ideas" element={
            <ProtectedRoute allowedRoles={['Academic Staff', 'Support Staff']}>
              <MyIdeas />
            </ProtectedRoute>
          } />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />

          {/* Learning Materials */}
          <Route path="/learning-materials" element={<ProtectedRoute><LearningMaterials /></ProtectedRoute>} />
          <Route path="/learning-materials/:id" element={<ProtectedRoute><LearningMaterialDetail /></ProtectedRoute>} />

          {/* Reports */}
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

          {/* Dashboard Routes */}
          <Route path="/dashboard/system" element={<ProtectedRoute roles={ADMIN}><SystemOverview /></ProtectedRoute>} />
          <Route path="/dashboard/teaching" element={<ProtectedRoute roles={QA}><TeachingQuality /></ProtectedRoute>} />
          <Route path="/dashboard/staff" element={<ProtectedRoute roles={QA}><StaffContribution /></ProtectedRoute>} />
          <Route path="/dashboard/engagement" element={<ProtectedRoute roles={QA}><IdeaEngagement /></ProtectedRoute>} />
          <Route path="/dashboard/performance" element={<ProtectedRoute roles={QA}><StaffPerformance /></ProtectedRoute>} />

          <Route path="/attendance" element={
            <ProtectedRoute allowedRoles={['Administrator', 'QA Manager']}>
              <Attendance />
            </ProtectedRoute>
          } />
          <Route path="/my-attendance" element={
            <ProtectedRoute allowedRoles={['Academic Staff', 'Support Staff']}>
              <MyAttendance />
            </ProtectedRoute>
          } />
          <Route path="/campaigns" element={
            <ProtectedRoute allowedRoles={['Administrator', 'QA Manager']}>
              <Campaigns />
            </ProtectedRoute>
          } />
          <Route path="/user" element={
            <ProtectedRoute allowedRoles={['Administrator']}>
              <UserManagement />
            </ProtectedRoute>
          } />
          {/* Default */}
          <Route path="/my-classes" element={
            <ProtectedRoute allowedRoles={['Student']}>
              <MyClasses />
            </ProtectedRoute>
          } />
          <Route path="/my-classes/:id" element={
            <ProtectedRoute allowedRoles={['Student']}>
              <ClassDetail />
            </ProtectedRoute>
          } />
          <Route path="/class-management" element={
            <ProtectedRoute allowedRoles={['Administrator']}>
              <ClassManagement />
            </ProtectedRoute>
          } />
          <Route path="/feedback-received" element={
            <ProtectedRoute allowedRoles={['Academic Staff']}>
              <FeedbackReceived />
            </ProtectedRoute>
          } />
          {/* Default redirect based on role */}
          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<RoleRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}