import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const roleHome = {
  "Student": "/my-classes",
  "Academic Staff": "/learning-materials",
  "Support Staff": "/ideas",
  "QA Coordinator": "/ideas",
  "QA Manager": "/ideas",
  "Administrator": "/ideas",
};

export default function ProtectedRoute({ children, roles, allowedRoles }) {
  const { isLoggedIn, user } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;

  const allowed = roles || allowedRoles;
  if (allowed && !allowed.includes(user?.role)) {
    return <Navigate to={roleHome[user?.role] || "/ideas"} replace />;
  }
  return children;
}