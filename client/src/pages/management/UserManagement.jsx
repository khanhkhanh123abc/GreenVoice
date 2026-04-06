import React, { useState, useEffect } from 'react';
import { Shield, Search, UserCog, Mail, Trash2, AlertCircle, X } from 'lucide-react';
import api from '../../api/axiosInstance';
import Layout from '../../components/common/Layout';
import Topbar from '../../components/navigation/Topbar';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

const ROLES = ["Student", "Academic Staff", "Support Staff", "QA Coordinator", "QA Manager", "Administrator"];

export default function UserManagement() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQ, setSearchQ] = useState("");
    const [page, setPage] = useState(1);
    const [deleteConfirm, setDeleteConfirm] = useState(null); // user obj
    const [deleting, setDeleting] = useState(false);
    const PAGE_SIZE = 10;

    // 1. FETCH USER LIST
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/user');
            setUsers(data || []);
        } catch (error) {
            toast.error("Failed to load user list.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => { setPage(1); }, [searchQ]);

    // 2. HANDLE ROLE CHANGE (Auto-save)
    const handleRoleChange = async (userId, newRole) => {
        try {
            // Immediately update UI for smooth feel (Optimistic UI)
            setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
            
            // Send request to Backend
            await api.put(`/user/${userId}/role`, { role: newRole });
            toast.success(`Role ${newRole} assigned successfully!`);
        } catch (error) {
            // On error, re-fetch original data
            fetchUsers();
            toast.error("Error updating role. Please try again!");
        }
    };

    // 3. HANDLE DELETE USER
    const handleDelete = async () => {
        if (!deleteConfirm) return;
        setDeleting(true);
        try {
            await api.delete(`/user/${deleteConfirm._id}`);
            setUsers(prev => prev.filter(u => u._id !== deleteConfirm._id));
            toast.success(`Account "${deleteConfirm.name}" deleted successfully!`);
            setDeleteConfirm(null);
        } catch (error) {
            toast.error("Error deleting account. Please try again!");
        } finally {
            setDeleting(false);
        }
    };
    const filteredUsers = users.filter(u => 
        u.name?.toLowerCase().includes(searchQ.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchQ.toLowerCase()) ||
        u.department?.toLowerCase().includes(searchQ.toLowerCase())
    );
    const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
    const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <Layout>
            <Topbar title="System Role Management" />
            
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-6xl mx-auto space-y-6">
                    
                    {/* SEARCH AND STATS AREA */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">User Management</h2>
                                <p className="text-sm text-slate-500">Total: {users.length} accounts</p>
                            </div>
                        </div>

                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="Search by name, email, department..." 
                                value={searchQ}
                                onChange={(e) => setSearchQ(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* TABLE */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                                        <th className="p-4 font-semibold">Account</th>
                                        <th className="p-4 font-semibold">Join Date</th>
                                        <th className="p-4 font-semibold text-center">Role</th>
                                        <th className="p-4 font-semibold text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="p-12 text-center text-slate-500">
                                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                                Loading data...
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="p-12 text-center text-slate-500">
                                                No matching users found.
                                            </td>
                                        </tr>
                                    ) : (
                                        pagedUsers.map((user) => (
                                            <tr key={user._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                
                                                {/* Info column */}
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

                                                {/* Created date column */}
                                                <td className="p-4">
                                                    <span className="text-sm text-slate-500">
                                                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                                    </span>
                                                </td>

                                                {/* Role assignment (Dropdown) column */}
                                                <td className="p-4 text-center">
                                                    <div className="inline-flex items-center relative">
                                                        <UserCog size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
                                                        <select
                                                            value={user.role}
                                                            onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                            className={`pl-9 pr-4 py-2 text-sm font-bold border rounded-lg cursor-pointer outline-none transition-colors appearance-none w-44 ${user.role === 'Administrator' ? 'bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500' : user.role === 'Student' ? 'bg-slate-50 text-slate-600 border-slate-300 focus:ring-slate-500' : 'bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500'}`}
                                                        >
                                                            {ROLES.map(r => (
                                                                <option key={r} value={r} className="font-medium text-slate-800 bg-white">{r}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </td>

                                                {/* Delete column */}
                                                <td className="p-4 text-center">
                                                    {user._id !== currentUser?._id && user._id !== currentUser?.id ? (
                                                        <button
                                                            onClick={() => setDeleteConfirm(user)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete account"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-300 italic">You</span>
                                                    )}
                                                </td>

                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {!loading && totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                                <p className="text-sm text-slate-500">
                                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredUsers.length)} of {filteredUsers.length} users
                                </p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                        Prev
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                        <button key={p} onClick={() => setPage(p)}
                                            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                            {p}
                                        </button>
                                    ))}
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                        className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </main>

            {/* Delete Confirm Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-900">Delete Account</h2>
                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={18} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
                            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-red-700">This action cannot be undone.</p>
                                <p className="text-sm text-red-600 mt-1">
                                    You are about to permanently delete the account of <strong>{deleteConfirm.name}</strong> ({deleteConfirm.email}).
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={15} />
                                {deleting ? "Deleting..." : "Delete Account"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}