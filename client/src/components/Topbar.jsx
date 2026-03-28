import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, Menu } from 'lucide-react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { socket } from '../App';

export default function Topbar({ title, onSearch, showNewIdea, onNewIdea, toggleSidebar }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // States cho Thông báo
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 1. LẤY LỊCH SỬ THÔNG BÁO TỪ DATABASE KHI LOAD TRANG
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data);
      } catch (error) {
        console.error("Lỗi tải thông báo:", error);
      }
    };
    fetchNotifications();
  }, [user]);

  // 2. LẮNG NGHE SOCKET ĐỂ BẬT THÔNG BÁO MỚI LÊN ĐẦU
  useEffect(() => {
    socket.on("notification", (newNotif) => {
      // Normalize ideaId thành string phòng trường hợp server gửi ObjectId
      const normalized = {
        ...newNotif,
        _id:    newNotif._id?.toString()    || newNotif._id,
        ideaId: newNotif.ideaId?.toString() || newNotif.ideaId,
      };
      setNotifications(prev => [normalized, ...prev]);
    });

    return () => socket.off("notification");
  }, []);

  // 3. TẮT DROPDOWN KHI CLICK RA NGOÀI
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Hàm xử lý khi gõ tìm kiếm
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) onSearch(value);
  };

  // Hàm xử lý khi click vào 1 thông báo
  const handleNotificationClick = async (notif) => {
    setShowDropdown(false);

    // Nếu chưa đọc thì gọi API đánh dấu đã đọc
    if (!notif.isRead) {
      try {
        await api.put(`/notifications/${notif._id}/read`);
        // Cập nhật lại state mảng để nó đổi màu
        setNotifications(prev =>
          prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n)
        );
      } catch (error) {
        console.error("Lỗi update thông báo:", error);
      }
    }

    // Chuyển hướng đến bài viết
    if (notif.ideaId) {
      navigate(`/ideas/${notif.ideaId.toString()}`);
    }
  };

  // Tính thời gian trôi qua
  const timeAgo = (date) => {
    const d = Math.floor((Date.now() - new Date(date)) / 1000);
    if (d < 60) return "Vừa xong";
    if (d < 3600) return `${Math.floor(d / 60)} phút trước`;
    if (d < 86400) return `${Math.floor(d / 3600)} giờ trước`;
    return `${Math.floor(d / 86400)} ngày trước`;
  };

  // Đếm số thông báo chưa đọc
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

        {/* KHU VỰC CHUÔNG THÔNG BÁO */}
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

          {/* DROPDOWN DANH SÁCH THÔNG BÁO */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Thông báo</h3>
                <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">{unreadCount} mới</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">Chưa có thông báo nào.</div>
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
            <span className="hidden sm:inline">New Idea</span>
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