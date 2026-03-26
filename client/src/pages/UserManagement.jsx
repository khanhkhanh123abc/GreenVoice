import React, { useState, useEffect } from 'react';
import { Shield, Search, UserCog, Mail } from 'lucide-react';
import api from '../api/axiosInstance';
import Layout from '../components/Layout';
import Topbar from '../components/Topbar';
import { toast } from 'react-toastify';

const ROLES = ["Student", "Academic Staff", "Support Staff", "QA Coordinator", "QA Manager", "Administrator"];

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState("");

    // 1. LẤY DANH SÁCH NGƯỜI DÙNG
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/user');
            setUsers(data || []);
        } catch (error) {
            toast.error("Không thể tải danh sách người dùng.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    // 2. XỬ LÝ KHI THAY ĐỔI ROLE (Auto-save)
    const handleRoleChange = async (userId, newRole) => {
        try {
            // Cập nhật UI ngay lập tức cho mượt (Optimistic UI)
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
            
            // Gửi lệnh xuống Backend
            await api.put(`/user/${userId}/role`, { role: newRole });
            toast.success(`Đã cấp quyền ${newRole} thành công!`);
        } catch (error) {
            // Nếu lỗi, fetch lại dữ liệu gốc
            fetchUsers();
            toast.error("Lỗi khi cập nhật quyền. Vui lòng thử lại!");
        }
    };

    // Bộ lọc tìm kiếm
    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchQ.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchQ.toLowerCase()) ||
        u.department?.toLowerCase().includes(searchQ.toLowerCase())
    );

    return (
        <Layout>
            <Topbar title="Phân quyền Hệ thống" />
            
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-6xl mx-auto space-y-6">
                    
                    {/* KHU VỰC TÌM KIẾM VÀ THỐNG KÊ */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Quản lý Người dùng</h2>
                                <p className="text-sm text-slate-500">Tổng số: {users.length} tài khoản</p>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Tìm theo tên, email, khoa..." 
                                value={searchQ}
                                onChange={(e) => setSearchQ(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* BẢNG DANH SÁCH */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                                        <th className="p-4 font-semibold">Tài khoản</th>
                                        <th className="p-4 font-semibold">Khoa / Phòng ban</th>
                                        <th className="p-4 font-semibold">Ngày tham gia</th>
                                        <th className="p-4 font-semibold text-right">Cấp quyền (Role)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="p-12 text-center text-slate-500">
                                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                                Đang tải dữ liệu...
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="p-12 text-center text-slate-500">
                                                Không tìm thấy người dùng nào phù hợp.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                
                                                {/* Cột Thông tin */}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                                                            {user.name[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{user.name}</p>
                                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail size={12}/> {user.email}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Cột Phòng ban */}
                                                <td className="p-4">
                                                    <span className="text-sm text-slate-600 font-medium">
                                                        {user.department || <span className="text-slate-400 italic">Chưa cập nhật</span>}
                                                    </span>
                                                </td>

                                                {/* Cột Ngày tạo */}
                                                <td className="p-4">
                                                    <span className="text-sm text-slate-500">
                                                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </td>

                                                {/* Cột Phân quyền (Dropdown) */}
                                                <td className="p-4 text-right">
                                                    <div className="inline-flex items-center relative">
                                                        <UserCog size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                                                        <select 
                                                            value={user.role}
                                                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                            className={`pl-9 pr-8 py-2 text-sm font-bold border rounded-lg cursor-pointer outline-none transition-colors appearance-none ${user.role === 'Administrator' ? 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500' : user.role === 'Student' ? 'bg-slate-50 text-slate-600 border-slate-300 focus:ring-slate-500' : 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500'}`}
                                                        >
                                                            {ROLES.map(r => (
                                                                <option key={r} value={r} className="font-medium text-slate-800 bg-white">{r}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </td>

                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>
        </Layout>
    );
}