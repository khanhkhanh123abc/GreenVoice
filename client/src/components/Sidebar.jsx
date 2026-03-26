import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LogOut, Settings, Home, Lightbulb, ClipboardList,
  BarChart2, Users, BookOpen, Flag, Monitor, GraduationCap,
  UserCheck, MessageSquare, Trophy, Clock, Star, ChevronRight,
  Megaphone
} from "lucide-react";

const navGroups = [
  {
    label: null,
    items: [
      { to: "/ideas", icon: Home, label: "Home", roles: ["Academic Staff", "Support Staff", "QA Coordinator", "QA Manager", "Administrator"] },
      { to: "/learning-materials", icon: BookOpen, label: "Learning Materials", roles: ["Academic Staff", "Support Staff", "QA Coordinator", "QA Manager", "Administrator", "Student"] },
      { to: "/my-classes", icon: GraduationCap, label: "My Classes", roles: ["Student"] },
    ]
  },
  {
    label: "My Work",
    items: [
      { to: "/submit-idea", icon: Lightbulb, label: "Submit Idea", roles: ["Academic Staff", "Support Staff"] },
      { to: "/my-ideas", icon: ClipboardList, label: "My Ideas", roles: ["Academic Staff", "Support Staff"] },
      { to: "/my-attendance", icon: Clock, label: "My Attendance", roles: ["Academic Staff", "Support Staff"] },
      { to: "/feedback-received", icon: Star, label: "Feedback", roles: ["Academic Staff"] },
    ]
  },
  {
    label: "Management",
    items: [
      { to: "/campaigns", icon: Megaphone, label: "Campaigns", roles: ["Administrator", "QA Manager"] }, // Menu của bạn đã được thêm vào đây
      { to: "/reports", icon: Flag, label: "Reports", roles: ["QA Coordinator", "Administrator"] },
      { to: "/analytics", icon: BarChart2, label: "Analytics", roles: ["QA Manager", "Administrator"] },
      { to: "/users", icon: Users, label: "Users", roles: ["Administrator"] },
      { to: "/class-management", icon: GraduationCap, label: "Class Management", roles: ["Administrator"] },
      { to: "/attendance", icon: UserCheck, label: "Attendance", roles: ["Administrator", "QA Manager"] }, // Đã gộp chung Attendance
    ]
  },
  {
    label: "Dashboards",
    items: [
      { to: "/dashboard/system", icon: Monitor, label: "System Overview", roles: ["Administrator"] },
      { to: "/dashboard/teaching", icon: GraduationCap, label: "Teaching Quality", roles: ["QA Manager", "Administrator"] },
      { to: "/dashboard/staff", icon: UserCheck, label: "Staff Contribution", roles: ["QA Manager", "Administrator"] },
      { to: "/dashboard/engagement", icon: MessageSquare, label: "Idea Engagement", roles: ["QA Manager", "Administrator"] },
      { to: "/dashboard/performance", icon: Trophy, label: "Staff Performance", roles: ["QA Manager", "Administrator"] },
    ]
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleColor = {
    "Administrator": { bg: "bg-red-100", text: "text-red-600" },
    "QA Manager": { bg: "bg-purple-100", text: "text-purple-600" },
    "QA Coordinator": { bg: "bg-orange-100", text: "text-orange-600" },
    "Academic Staff": { bg: "bg-blue-100", text: "text-blue-600" },
    "Support Staff": { bg: "bg-green-100", text: "text-green-600" },
    "Student": { bg: "bg-cyan-100", text: "text-cyan-600" },
  };
  const rc = roleColor[user?.role] || { bg: "bg-slate-100", text: "text-slate-500" };

  return (
    <aside className="w-[210px] h-screen bg-white border-r border-slate-100 flex flex-col shrink-0 z-10 relative">

      {/* ── Logo ── */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-base shadow-sm">
          🎓
        </div>
        <div>
          <div className="text-[14px] font-extrabold text-slate-900 leading-tight">UniVoice</div>
          <div className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Portal</div>
        </div>
      </div>

      {/* ── Nav groups (scrollable) ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5" style={{ scrollbarWidth: "none" }}>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            ({ roles }) => !roles || roles.includes(user?.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label || "_main"} className="mb-0.5">
              {group.label && (
                <div className="px-3 pt-2.5 pb-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.14em]">
                    {group.label}
                  </span>
                </div>
              )}
              {visibleItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] font-semibold transition-all duration-150 ${isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={14} className="shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {isActive && (
                        <ChevronRight size={11} className="shrink-0 opacity-30" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── Bottom ── */}
      <div className="shrink-0 border-t border-slate-100 px-2 py-2">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] font-semibold transition-all mb-1 ${isActive ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`
          }
        >
          <Settings size={14} className="shrink-0" />
          <span>Settings</span>
        </NavLink>

        {/* User card */}
        <div
          className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          onClick={() => navigate("/profile")}
        >
          <div className={`w-7 h-7 rounded-md ${rc.bg} ${rc.text} flex items-center justify-center text-[11px] font-bold shrink-0`}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="text-[12px] font-bold text-slate-800 truncate leading-tight">
              {user?.name || "User"}
            </div>
            <div className={`text-[10px] font-semibold truncate leading-tight ${rc.text}`}>
              {user?.role}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
            title="Đăng xuất"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}