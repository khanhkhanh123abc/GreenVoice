import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LogOut, Home, Lightbulb, ClipboardList,
  Users, BookOpen, Flag, GraduationCap,
  UserCheck, Clock, Star, ChevronRight,
  Megaphone, ShieldCheck, FileText,
  Monitor, MessageSquare, Trophy, Menu, X
} from "lucide-react";

const navGroups = [
  {
    label: "Explore",
    items: [
      { to: "/ideas",             icon: Home,          label: "Home",               roles: ["Academic Staff","Support Staff","QA Coordinator","QA Manager","Administrator"] },
      { to: "/learning-materials",icon: BookOpen,      label: "Learning Materials", roles: ["Academic Staff","Support Staff","QA Coordinator","QA Manager","Administrator","Student"] },
      { to: "/my-classes",        icon: GraduationCap, label: "My Classes",         roles: ["Student"] },
    ]
  },
  {
    label: "My Work",
    items: [
      { to: "/submit-idea",       icon: Lightbulb,     label: "Submit Idea",        roles: ["Academic Staff","Support Staff"] },
      { to: "/my-ideas",          icon: ClipboardList, label: "My Ideas",           roles: ["Academic Staff","Support Staff"] },
      { to: "/my-materials",      icon: FileText,      label: "My Materials",       roles: ["Academic Staff","Support Staff"] },
      { to: "/my-attendance",     icon: Clock,         label: "My Attendance",      roles: ["Academic Staff","Support Staff"] },
      { to: "/feedback-received", icon: Star,          label: "Feedback",           roles: ["Academic Staff","QA Coordinator"] },
    ]
  },
  {
    label: "Management",
    items: [
      { to: "/campaigns",         icon: Megaphone,     label: "Campaigns",          roles: ["Administrator","QA Manager"] },
      { to: "/reports",           icon: Flag,          label: "Reports",            roles: ["QA Coordinator","Administrator"] },
      { to: "/content-review",    icon: ShieldCheck,   label: "Content Review",     roles: ["QA Coordinator","QA Manager","Administrator"] },
      { to: "/user",              icon: Users,         label: "Users",              roles: ["Administrator"] },
      { to: "/class-management",  icon: GraduationCap, label: "Class Management",   roles: ["Administrator"] },
      { to: "/attendance",        icon: UserCheck,     label: "Attendance",         roles: ["Administrator","QA Manager"] },
    ]
  },
  {
    label: "Dashboards",
    items: [
      { to: "/dashboard/system",      icon: Monitor,       label: "System Overview",    roles: ["Administrator"] },
      { to: "/dashboard/teaching",    icon: GraduationCap, label: "Teaching Quality",   roles: ["QA Manager","Administrator"] },
      { to: "/dashboard/staff",       icon: UserCheck,     label: "Staff Contribution", roles: ["QA Manager","Administrator"] },
      { to: "/dashboard/engagement",  icon: MessageSquare, label: "Idea Engagement",    roles: ["QA Manager","Administrator"] },
      { to: "/dashboard/performance", icon: Trophy,        label: "Staff Performance",  roles: ["QA Manager","Administrator"] },
    ]
  },
];

function SidebarContent({ user, onNavigate, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const roleColor = {
    "Administrator":  { bg: "bg-red-100",    text: "text-red-600" },
    "QA Manager":     { bg: "bg-purple-100", text: "text-purple-600" },
    "QA Coordinator": { bg: "bg-orange-100", text: "text-orange-600" },
    "Academic Staff": { bg: "bg-blue-100",   text: "text-blue-600" },
    "Support Staff":  { bg: "bg-green-100",  text: "text-green-600" },
    "Student":        { bg: "bg-cyan-100",   text: "text-cyan-600" },
  };
  const rc = roleColor[user?.role] || { bg: "bg-slate-100", text: "text-slate-500" };

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <aside className="w-[210px] h-screen bg-white border-r border-slate-100 flex flex-col shrink-0 z-10 relative">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-base shadow-sm">🎓</div>
        <div>
          <div className="text-[14px] font-extrabold text-slate-900 leading-tight">UniVoice</div>
          <div className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Portal</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto lg:hidden p-1 text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5" style={{ scrollbarWidth: "none" }}>
        {navGroups.map((group) => {
          const visible = group.items.filter(({ roles }) => !roles || roles.includes(user?.role));
          if (!visible.length) return null;
          return (
            <div key={group.label} className="mb-0.5">
              {group.label && (
                <div className="px-3 pt-2.5 pb-0.5">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.14em]">{group.label}</span>
                </div>
              )}
              {visible.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-[12.5px] font-semibold transition-all duration-150 ${
                      isActive ? "bg-blue-50 text-blue-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={14} className="shrink-0" />
                      <span className="flex-1 truncate">{label}</span>
                      {isActive && <ChevronRight size={11} className="shrink-0 opacity-30" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-slate-100 px-2 py-2">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          onClick={() => { navigate("/profile"); onClose?.(); }}>
          <div className={`w-7 h-7 rounded-md ${rc.bg} ${rc.text} flex items-center justify-center text-[11px] font-bold shrink-0`}>
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <div className="text-[12px] font-bold text-slate-800 truncate leading-tight">{user?.name || "User"}</div>
            <div className={`text-[10px] font-semibold truncate leading-tight ${rc.text}`}>{user?.role}</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0" title="Logout">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex shrink-0">
        <SidebarContent user={user} />
      </div>

      {/* Mobile hamburger button */}
      <button onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 w-9 h-9 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50">
        <Menu size={18} />
      </button>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
          <div className="lg:hidden fixed left-0 top-0 h-full z-50 shadow-xl">
            <SidebarContent user={user} onClose={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
