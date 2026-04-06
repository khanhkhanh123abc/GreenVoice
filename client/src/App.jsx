import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/common/ProtectedRoute";

function RoleRedirect() {
  const { user, isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (user?.role === "Student") return <Navigate to="/my-classes" replace />;
  return <Navigate to="/ideas" replace />;
}

// Import Socket and Toast libraries
import { io } from "socket.io-client";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Ideas from "./pages/ideas/Ideas";
import Profile from "./pages/user/Profile";
import SubmitIdea from "./pages/ideas/SubmitIdea";
import IdeaDetail from "./pages/ideas/IdeaDetail";
import Users from "./pages/management/Users";
import LearningMaterials from "./pages/learning/LearningMaterials";
import LearningMaterialDetail from "./pages/learning/LearningMaterialDetail";
import Reports from "./pages/management/Reports";
import MyAttendance from "./pages/user/MyAttendance";
import MyIdeas from "./pages/ideas/MyIdeas";
import ContentReview from "./pages/ideas/ContentReview";
import Campaigns from "./pages/management/Campaigns";
import UserManagement from "./pages/management/UserManagement";

// Import Dashboard pages
import SystemOverview from "./pages/dashboards/SystemOverview";
import TeachingQuality from "./pages/dashboards/TeachingQuality";
import StaffContribution from "./pages/dashboards/StaffContribution";
import IdeaEngagement from "./pages/dashboards/IdeaEngagement";
import StaffPerformance from "./pages/dashboards/StaffPerformance";

import Attendance from "./pages/management/Attendance";
import MyClasses from "./pages/user/MyClasses";
import ClassDetail from "./pages/user/ClassDetail";
import ClassManagement from "./pages/management/ClassManagement";
import FeedbackReceived from "./pages/user/FeedbackReceived";
import StaffClassView from "./pages/user/StaffClassView";
import MyClassStaff from "./pages/user/MyClassStaff";

const QA = ["QA Manager", "Administrator"];
const ADMIN = ["Administrator"];

// Initialize Socket
export const socket = io("http://localhost:3000", {
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
          <Route path="/content-review" element={<ContentReview />} />
            <Route path="/my-ideas" element={
            <ProtectedRoute allowedRoles={['Academic Staff', 'Support Staff']}>
              <MyIdeas />
            </ProtectedRoute>
          } />
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
            <ProtectedRoute allowedRoles={['Administrator', 'QA Coordinator']}>
              <ClassManagement />
            </ProtectedRoute>
          } />

          {/* Feedback — Academic Staff sees own, QAC/Admin sees all */}
          <Route path="/feedback-received" element={
            <ProtectedRoute allowedRoles={['Academic Staff', 'QA Coordinator', 'Administrator']}>
              <FeedbackReceived />
            </ProtectedRoute>
          } />

          <Route path="/staff-class/:id" element={
            <ProtectedRoute allowedRoles={['Academic Staff', 'Support Staff']}>
              <StaffClassView />
            </ProtectedRoute>
          } />
          <Route path="/my-class" element={
            <ProtectedRoute allowedRoles={['Academic Staff', 'Support Staff']}>
              <MyClassStaff />
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