import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, XCircle, Filter } from 'lucide-react';
import api from '../../api/axiosInstance';
import Layout from '../../components/common/Layout';
import Topbar from '../../components/navigation/Topbar';

export default function MyAttendance() {
    const currentDate = new Date();
    const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
    const [year, setYear] = useState(currentDate.getFullYear().toString());
    
    const [records, setRecords] = useState([]);
    const [stats, setStats] = useState({ present: 0, late: 0, absent: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    const years = Array.from({length: 3}, (_, i) => (currentDate.getFullYear() - i).toString());

    useEffect(() => {
        const fetchMyAttendance = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/attendance/my-records?month=${month}&year=${year}`);
                setRecords(data.records || []);
                setStats(data.stats || { present: 0, late: 0, absent: 0, total: 0 });
            } catch (error) {
                console.error("Error loading attendance history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchMyAttendance();
    }, [month, year]);

    // Algorithm to build Calendar grid
    const generateCalendarDays = () => {
        const y = parseInt(year);
        const m = parseInt(month);
        
        // Number of days in selected month
        const daysInMonth = new Date(y, m, 0).getDate();
        
        // Which weekday does day 1 fall on? (0 = Sunday, 1 = Monday...)
        const firstDayIndex = new Date(y, m - 1, 1).getDay();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Clear time portion for accurate date comparison

        const daysArray = [];

        // 1. Create empty cells at the start of month (Padding)
        for (let i = 0; i < firstDayIndex; i++) {
            daysArray.push(null);
        }

        // 2. Fill in real days of the month
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
            const thisDateObj = new Date(y, m - 1, d);
            
            // Check if this date has an attendance record
            const record = records.find(r => r.date === dateStr);
            
            let statusType = 'NoData'; // Default: past date with no data
            if (record) {
                statusType = record.status;
            } else if (thisDateObj > today) {
                statusType = 'Future'; // Future date not yet reached
            }

            daysArray.push({
                dayNumber: d,
                dateStr,
                statusType,
                note: record?.note || ""
            });
        }
        return daysArray;
    };

    // Function to render Status label on Calendar
    const renderStatusLabel = (statusType) => {
        switch (statusType) {
            case 'Present': 
                return <span className="mt-1 w-full text-center py-1 px-1 bg-emerald-100 text-emerald-700 font-bold text-[10px] sm:text-xs rounded-md">On Time</span>;
            case 'Late': 
                return <span className="mt-1 w-full text-center py-1 px-1 bg-amber-100 text-amber-700 font-bold text-[10px] sm:text-xs rounded-md">Late</span>;
            case 'Absent': 
                return <span className="mt-1 w-full text-center py-1 px-1 bg-red-100 text-red-700 font-bold text-[10px] sm:text-xs rounded-md">Absent</span>;
            case 'NoData': 
                return <span className="mt-1 w-full text-center py-1 px-1 bg-slate-100 text-slate-500 font-medium text-[10px] sm:text-xs rounded-md">No Data</span>;
            case 'Future': 
                return <span className="mt-1 w-full text-center py-1 px-1 text-slate-300 font-medium text-[10px] sm:text-xs">Upcoming</span>;
            default: return null;
        }
    };

    const calendarGrid = generateCalendarDays();
    const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <Layout>
            <Topbar title="My Attendance History" />
            
            <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-6xl mx-auto space-y-6">
                    
                    {/* FILTER */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-slate-700 font-semibold">
                            <Filter size={20} className="text-blue-500" />
                            <span>Filter by time:</span>
                        </div>
                        <div className="flex gap-3">
                            <select value={month} onChange={(e) => setMonth(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium cursor-pointer">
                                {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m.toString()}>Month {m}</option>)}
                            </select>
                            <select value={year} onChange={(e) => setYear(e.target.value)} className="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-medium cursor-pointer">
                                {years.map(y => <option key={y} value={y}>Year {y}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* STATS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center"><CheckCircle size={28} /></div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase">On Time</p>
                                <p className="text-2xl font-extrabold text-slate-900">{stats.present} <span className="text-sm font-medium text-slate-400">days</span></p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center"><Clock size={28} /></div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase">Late</p>
                                <p className="text-2xl font-extrabold text-slate-900">{stats.late} <span className="text-sm font-medium text-slate-400">days</span></p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><XCircle size={28} /></div>
                            <div>
                                <p className="text-sm font-bold text-slate-500 uppercase">Absent</p>
                                <p className="text-2xl font-extrabold text-slate-900">{stats.absent} <span className="text-sm font-medium text-slate-400">days</span></p>
                            </div>
                        </div>
                    </div>

                    {/* CALENDAR GRID */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Calendar size={20} className="text-blue-500" /> Attendance Calendar – Month {month}/{year}
                            </h3>
                        </div>

                        {loading ? (
                            <div className="p-16 text-center text-slate-500">
                                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                                Building calendar...
                            </div>
                        ) : (
                            <div className="p-4 sm:p-6">
                                {/* Days of week header */}
                                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                                    {DAYS_OF_WEEK.map(day => (
                                        <div key={day} className="text-center text-xs sm:text-sm font-bold text-slate-400 uppercase py-2">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Day cells (7-column Grid) */}
                                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                                    {calendarGrid.map((cell, index) => (
                                        <div 
                                            key={index} 
                                            className={`aspect-square sm:aspect-auto sm:h-24 rounded-xl border flex flex-col p-1 sm:p-2 transition-colors relative group
                                                ${cell ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm' : 'bg-transparent border-transparent'}
                                            `}
                                        >
                                            {cell && (
                                                <>
                                                    {/* Day number */}
                                                    <span className={`text-right text-sm sm:text-base font-bold mb-auto ${cell.statusType === 'Future' ? 'text-slate-300' : 'text-slate-700'}`}>
                                                        {cell.dayNumber}
                                                    </span>
                                                    
                                                    {/* Status label at bottom of cell */}
                                                    {renderStatusLabel(cell.statusType)}

                                                    {/* Show tooltip on hover if note exists */}
                                                    {cell.note && (
                                                        <div className="absolute z-10 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[150px] bg-slate-800 text-white text-xs p-2 rounded shadow-lg break-words">
                                                            Reason: {cell.note}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </Layout>
    );
}