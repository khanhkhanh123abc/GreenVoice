import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Calendar, Clock, AlertCircle } from 'lucide-react';
import api from '../../api/axiosInstance';
import Layout from '../../components/common/Layout';
import Topbar from '../../components/navigation/Topbar';
import { toast } from 'react-toastify';

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // States for Create New Modal
    const [showModal, setShowModal] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        closureDate: '',
        finalClosureDate: ''
    });

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/campaigns');
            setCampaigns(data);
        } catch (error) {
            toast.error("Failed to load Campaign list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        
        // Frontend time logic validation
        if (new Date(formData.closureDate) >= new Date(formData.finalClosureDate)) {
            toast.error("Final Closure must be after Submission Deadline!");
            return;
        }

        setFormLoading(true);
        try {
            await api.post('/campaigns', formData);
            toast.success("New Campaign created successfully!");
            setShowModal(false);
            setFormData({ name: '', description: '', closureDate: '', finalClosureDate: '' });
            fetchCampaigns(); // Reload list
        } catch (error) {
            toast.error(error.response?.data?.message || "An error occurred while creating the campaign");
        } finally {
            setFormLoading(false);
        }
    };

    const getStatus = (c) => {
        const now = new Date();
        const closure = new Date(c.closureDate);
        const finalClosure = new Date(c.finalClosureDate);

        if (!c.isActive) return { label: 'Cancelled', bg: 'bg-slate-100', text: 'text-slate-600' };
        if (now > finalClosure) return { label: 'Fully Closed', bg: 'bg-red-100', text: 'text-red-700' };
        if (now > closure) return { label: 'Submission Locked', bg: 'bg-amber-100', text: 'text-amber-700' };
        return { label: 'Open (Accepting Ideas)', bg: 'bg-emerald-100', text: 'text-emerald-700' };
    };

    return (
        <Layout>
            <Topbar title="Campaign Management" />
            
            <main className="flex-1 p-6 lg:p-8 overflow-y-auto bg-slate-50">
                <div className="max-w-6xl mx-auto space-y-6">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">Campaign List</h2>
                            <p className="text-sm text-slate-500 mt-1">Manage idea collection rounds for the university.</p>
                        </div>
                        <button 
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus size={20} /> Create New Campaign
                        </button>
                    </div>

                    {/* Campaign Card List */}
                    {loading ? (
                        <div className="text-center py-12 text-slate-500">Loading data...</div>
                    ) : campaigns.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center">
                            <Megaphone size={48} className="text-slate-300 mb-4" />
                            <p className="text-lg font-bold text-slate-700">No Campaigns yet</p>
                            <p className="text-slate-500 mt-1">Create the first campaign so staff can submit ideas!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {campaigns.map(c => {
                                const status = getStatus(c);
                                return (
                                    <div key={c._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Megaphone size={24} /></div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.text}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        
                                        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">{c.name}</h3>
                                        <p className="text-sm text-slate-600 mb-6 line-clamp-3 flex-1">{c.description}</p>
                                        
                                        <div className="space-y-3 pt-4 border-t border-slate-100">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2 text-slate-500"><Calendar size={16}/> Submission Deadline:</span>
                                                <span className="font-bold text-slate-800">{new Date(c.closureDate).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="flex items-center gap-2 text-slate-500"><Clock size={16}/> Interaction Deadline:</span>
                                                <span className="font-bold text-slate-800">{new Date(c.finalClosureDate).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                </div>
            </main>

            {/* MODAL TẠO MỚI CHIẾN DỊCH */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
                    <div className="bg-white rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">Create New Campaign</h2>
                        
                        <form onSubmit={handleCreate} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Campaign Name <span className="text-red-500">*</span></label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="E.g. Spring 2026 Idea Collection" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Short Description <span className="text-red-500">*</span></label>
                                <textarea required rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="What is the purpose of this campaign?..." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
                                    <label className="block text-sm font-bold text-blue-900 mb-1.5 flex items-center gap-1.5"><Calendar size={16}/> Submission Deadline <span className="text-red-500">*</span></label>
                                    <input required type="datetime-local" value={formData.closureDate} onChange={e => setFormData({...formData, closureDate: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <p className="text-[10px] text-blue-600 mt-1">After this date, staff cannot submit new ideas.</p>
                                </div>
                                
                                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                                    <label className="block text-sm font-bold text-amber-900 mb-1.5 flex items-center gap-1.5"><Clock size={16}/> Interaction Deadline <span className="text-red-500">*</span></label>
                                    <input required type="datetime-local" value={formData.finalClosureDate} onChange={e => setFormData({...formData, finalClosureDate: e.target.value})} className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 outline-none" />
                                    <p className="text-[10px] text-amber-700 mt-1">After this date, all Likes & Comments are locked.</p>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2 font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={formLoading} className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm">
                                    {formLoading ? 'Creating...' : 'Create Campaign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
}