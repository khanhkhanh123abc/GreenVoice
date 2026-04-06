import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, Menu } from 'lucide-react';
import api from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../App';

export default function Topbar({ title, onSearch, showNewIdea, onNewIdea, newIdeaLabel, toggleSidebar }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // States for Notifications
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 1. FETCH NOTIFICATION HISTORY FROM DATABASE ON PAGE LOAD
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };
    fetchNotifications();
  }, [user]);

  // 2. LISTEN TO SOCKET TO PUSH NEW NOTIFICATIONS TO TOP
  useEffect(() => {
    socket.on("notification", (newNotif) => {
      const normalized = {
        ...newNotif,
        _id:      newNotif._id?.toString()      || newNotif._id,
        ideaId:   newNotif.ideaId?.toString()   || newNotif.ideaId   || null,
        reportId: newNotif.reportId?.toString() || newNotif.reportId || null,
      };
      setNotifications(prev => [normalized, ...prev]);
    });

    return () => socket.off("notification");
  }, []);

  // 3. CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handler for search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) onSearch(value);
  };

  // Handler for clicking a notification
  const handleNotificationClick = async (notif) => {
    setShowDropdown(false);

    // If unread, call API to mark as read
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/${notif._id}/read`);
        setNotifications(prev =>
          prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error("Error updating notification:", error);
      }
    }

    // Navigate based on notification type
    if (notif.type === "report") {
      // Report notifications → go to Reports page and highlight the specific report
      const reportId = notif.reportId || notif.ideaId; // fallback for old notifications
      if (reportId) {
        navigate(`/reports?highlight=${reportId}`);
      } else {
        navigate("/reports");
      }
    } else if (
      notif.message?.includes("phân công") ||
      notif.message?.includes("assigned") ||
      notif.message?.includes("dạy lớp")
    ) {
      // Staff assigned to class → go to staff class view
      const classId = notif.ideaId;
      if (classId) {
        navigate(`/staff-class/${classId}`);
      } else {
        navigate("/ideas");
      }
    } else if (
      notif.message?.includes("lớp") ||
      notif.message?.includes("class") ||
      notif.message?.includes("Class")
    ) {
      // Class management notifications → go to Class Management, highlight if classId exists
      const classId = notif.ideaId; // classId stored in ideaId field
      if (classId && !notif.message?.includes("xóa")) {
        navigate(`/class-management?highlight=${classId}`);
      } else {
        navigate("/class-management");
      }
    } else if (notif.ideaId) {
      // Idea / comment notifications → go to specific idea
      navigate(`/ideas/${notif.ideaId.toString()}`);
    }
  };

  // 2. LISTEN TO SOCKET TO PUSH NEW NOTIFICATIONS TO TOP
  // Also normalize reportId from socket payload
  

  // Calculate elapsed time
  const timeAgo = (date) => {
    const d = Math.floor((Date.now() - new Date(date)) / 1000);
    if (d < 60) return "Just now";
    if (d < 3600) return `${Math.floor(d / 60)} min ago`;
    if (d < 86400) return `${Math.floor(d / 3600)} hr ago`;
    return `${Math.floor(d / 86400)} days ago`;
  };

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-extrabold text-slate-900 hidden sm:block tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
        {onSearch && (
          <div className="relative w-full max-w-md hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search ideas, topics, or authors..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
            />
          </div>
        )}

        {/* NOTIFICATION BELL AREA */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative p-2 text-slate-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-full transition-colors flex items-center justify-center"
          >
            <Bell size={22} className={unreadCount > 0 ? "fill-yellow-500 text-yellow-500" : ""} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {/* NOTIFICATION LIST DROPDOWN */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Notifications</h3>
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{unreadCount} new</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No notifications yet.</div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif._id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${!notif.isRead ? 'bg-blue-50/40' : 'bg-white'}`}
                    >
                      <p className={`text-sm ${!notif.isRead ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                        {notif.message}
                      </p>
                      <span className={`text-xs mt-1 block ${!notif.isRead ? 'text-blue-500 font-medium' : 'text-slate-400'}`}>
                        {timeAgo(notif.createdAt || Date.now())}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {showNewIdea && (
          <button
            onClick={onNewIdea}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 hover:shadow-md transition-all shrink-0"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">{newIdeaLabel || "New Idea"}</span>
          </button>
        )}

        {user && (
          <div className="w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm border-2 border-white shrink-0">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </div>
    </header>
  );
}