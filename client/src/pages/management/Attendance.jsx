import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Save, UserCheck, UserX, Clock, Search, AlertCircle } from 'lucide-react';
import api from '../../api/axiosInstance';
import Layout from '../../components/common/Layout';
import Topbar from '../../components/navigation/Topbar';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

export default function Attendance() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Initialize today's date in YYYY-MM-DD format (local time)
    const today = new Date().toLocaleDateString('en-CA'); 
    
    const [date, setDate] = useState(today);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQ, setSearchQ] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    // 1. CALL API TO FETCH LIST BY DATE
    const fetchAttendance = async (selectedDate) => {
        setLoading(true);
        try {
            const { data } = await api.get(`/attendance/${selectedDate}`);
            setRecords(data.records || []);
        } catch (error) {
            console.error("Error loading attendance list:", error);
            if (error.response?.status === 403) {
                toast.error("You do not have permission to access this page!");
                navigate('/');
            } else {
                toast.error("Failed to load attendance list.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Auto-load data when date changes
    useEffect(() => {
        fetchAttendance(date);
        setPage(1);
    }, [date]);

    // Reset page on search
    useEffect(() => { setPage(1); }, [searchQ]);

    // 2. HANDLER FOR STATUS SELECTION (Present/Absent/Late)
    const handleStatusChange = (userId, newStatus) => {
        setRecords(prev => prev.map(record => 
            record.user._id === userId ? { ...record, status: newStatus } : record
        ));
    };

    // 3. HANDLER TO SAVE DATA TO SERVER
    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/attendance/${date}`, { records });
            toast.success(`Attendance for ${date} saved successfully!`);
        } catch (error) {
            toast.error("Error saving attendance. Please try again!");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    // Filter list based on Admin search input
    const filteredRecords = records.filter(r => 
        r.user?.name?.toLowerCase().includes(searchQ.toLowerCase()) || 
        r.user?.email?.toLowerCase().includes(searchQ.toLowerCase())
    );
    const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
    const pagedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    // Quick stats calculation
    const total = records.length;
    const presentCount = records.filter(r => r.status === 'Present').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;
    const lateCount = records.filter(r => r.status === 'Late').length;

    return (
        <Layout>
            <Topbar title="Staff Attendance Management" />
            
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-6xl mx-auto space-y-6">
                    
                    {/* DATE SELECTION AND STATS AREA */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Select Attendance Date</h2>
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="text-lg font-bold text-slate-900 border-none bg-transparent focus:ring-0 cursor-pointer outline-none"
                                />
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="flex gap-4 sm:gap-8">
                            <div className="text-center">
                                <p className="text-sm text-slate-500 font-semibold">Total</p>
                                <p className="text-xl font-bold text-slate-800">{total}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-emerald-500 font-semibold">Present</p>
                                <p className="text-xl font-bold text-emerald-600">{presentCount}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-amber-500 font-semibold">Late</p>
                                <p className="text-xl font-bold text-amber-600">{lateCount}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-red-500 font-semibold">Absent</p>
                                <p className="text-xl font-bold text-red-600">{absentCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* TABLE AREA */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        
                        {/* Table toolbar */}
                        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search staff name or email..." 
                                    value={searchQ}
                                    onChange={(e) => setSearchQ(e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            
                            <button 
                                onClick={handleSave}
                                disabled={saving || loading || records.length === 0}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <Save size={18} />
                                {saving ? "Saving..." : "Save Attendance"}
                            </button>
                        </div>

                        {/* Data table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                                        <th className="p-4 font-semibold">Staff</th>
                                        <th className="p-4 font-semibold text-center">Attendance Status</th>
                                        <th className="p-4 font-semibold">Note (Optional)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan="3" className="p-8 text-center text-slate-500">
                                                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                                Loading list...
                                            </td>
                                        </tr>
                                    ) : filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="p-8 text-center text-slate-500 flex flex-col items-center">
                                                <AlertCircle size={32} className="text-slate-300 mb-2" />
                                                No staff found!
                                            </td>
                                        </tr>
                                    ) : (
                                        pagedRecords.filter(r => r.user).map((record) => (
                                            <tr key={record.user._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                
                                                {/* Info column */}
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                                                            {record.user.name[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-800">{record.user.name}</p>
                                                            <p className="text-xs text-slate-500">{record.user.email} • {record.user.role}</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status button column */}
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => handleStatusChange(record.user._id, 'Present')}
                                                            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${record.status === 'Present' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                                        >
                                                            <UserCheck size={16} /> <span className="hidden sm:inline">Present</span>
                                                        </button>
                                                        
                                                        <button 
                                                            onClick={() => handleStatusChange(record.user._id, 'Late')}
                                                            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${record.status === 'Late' ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                                        >
                                                            <Clock size={16} /> <span className="hidden sm:inline">Late</span>
                                                        </button>

                                                        <button 
                                                            onClick={() => handleStatusChange(record.user._id, 'Absent')}
                                                            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${record.status === 'Absent' ? 'bg-red-100 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                                                        >
                                                            <UserX size={16} /> <span className="hidden sm:inline">Absent</span>
                                                        </button>
                                                    </div>
                                                </td>

                                                {/* Note column */}
                                                <td className="p-4">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Reason..." 
                                                        value={record.note}
                                                        onChange={(e) => {
                                                            setRecords(prev => prev.map(r => 
                                                                r.user._id === record.user._id ? { ...r, note: e.target.value } : r
                                                            ));
                                                        }}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                                                    />
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
                                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length} staff
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
        </Layout>
    );
}