import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import { Heart, MessageCircle, Eye, Share2 } from "lucide-react";
import { socket } from "../App";
import { toast } from "react-toastify";

const TOPIC_COLORS = {
  Academic: { bg: "bg-blue-50", text: "text-blue-600" },
  Support: { bg: "bg-green-50", text: "text-green-600" },
  "Campus Life": { bg: "bg-yellow-50", text: "text-yellow-600" },
  Facilities: { bg: "bg-emerald-50", text: "text-emerald-700" },
};

export default function MyIdeas() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ideas, setIdeas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 5 });
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(true);

  // States cho Edit/Delete
  const [modal, setModal] = useState(null); 
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchMyIdeas = useCallback(async (page = 1) => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 5 });
      if (searchQ) params.set("search", searchQ);
      
      // Gửi kèm ID của chính mình để Backend lọc
      params.set("author", user._id || user.id); 
      params.set("sortBy", "latest"); // Luôn xếp bài mới nhất lên đầu

      const { data } = await api.get(`/ideas?${params}`);
      setIdeas(data.ideas || []);
      setPagination({ ...data.pagination, page });
    } catch (error) {
      setIdeas([]);
      toast.error("Không thể tải danh sách bài viết của bạn.");
    } finally {
      setLoading(false);
    }
  }, [searchQ, user]);

  useEffect(() => { fetchMyIdeas(); }, [fetchMyIdeas]);

  useEffect(() => {
    api.get("/categories").then(({ data }) => setCategories(data.categories || [])).catch(() => { });
  }, []);

  // 🚀 BỘ THU SÓNG REAL-TIME (Giữ nguyên để số nhảy mượt)
  useEffect(() => {
    socket.on("global_update_likes", (data) => {
      setIdeas(prev => prev.map(item => item._id === data.ideaId ? { ...item, votes: data.newVotes, likes: data.likes } : item));
    });
    socket.on("global_update_comments", (data) => {
      setIdeas(prev => prev.map(item => item._id === data.ideaId ? { ...item, commentsCount: data.commentCount } : item));
    });
    return () => {
      socket.off("global_update_likes");
      socket.off("global_update_comments");
    };
  }, []);

  const closeModal = () => { setModal(null); setSelected(null); setFormError(""); };

  const handleEdit = async (e) => {
    e.preventDefault(); setFormError(""); setFormLoading(true);
    try {
      const payload = { ...form };
      if (!payload.closureDate) delete payload.closureDate;
      if (!payload.categoryId) delete payload.categoryId;
      await api.put(`/ideas/${selected._id}`, payload);
      closeModal(); fetchMyIdeas();
      toast.success("Cập nhật bài viết thành công!");
    } catch (err) { setFormError(err.response?.data?.message || "Failed to update."); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await api.delete(`/ideas/${selected._id}`);
      closeModal(); fetchMyIdeas();
      toast.success("Đã xóa bài viết.");
    } catch (err) { setFormError(err.response?.data?.message || "Failed to delete."); }
    finally { setFormLoading(false); }
  };

  const openEdit = (idea) => {
    setSelected(idea);
    setForm({ title: idea.title, content: idea.content, topicType: idea.topicType, isAnonymous: idea.isAnonymous, closureDate: idea.closureDate ? idea.closureDate.slice(0, 10) : "", categoryId: idea.categoryId || "" });
    setFormError(""); setModal("edit");
  };

  const totalPages = Math.ceil((pagination.total || 0) / 5);
  const tc = (type) => TOPIC_COLORS[type] || { bg: "bg-gray-100", text: "text-gray-600" };

  return (
    <Layout>
      <Topbar title="My Ideas" onSearch={setSearchQ} />

      <main className="flex-1 p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto">
            
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Bài viết của tôi ({pagination.total})</h2>
          </div>

          {/* Danh sách Ideas */}
          <div className="flex flex-col rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            {loading ? (
              <div className="text-center py-16 text-slate-500 font-medium bg-white">Loading your ideas...</div>
            ) : ideas.length === 0 ? (
              <div className="text-center py-16 bg-white flex flex-col items-center">
                <div className="text-5xl mb-4">📝</div>
                <div className="text-slate-500 font-medium mb-4">Bạn chưa đăng bài viết nào.</div>
                <button onClick={() => navigate('/submit-idea')} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">Đăng bài ngay</button>
              </div>
            ) : ideas.map((idea, idx) => (
              <IdeaCard
                key={idea._id}
                idea={idea}
                tc={tc}
                isLast={idx === ideas.length - 1}
                canEdit={true} // Bài của mình thì chắc chắn được sửa
                canDelete={true} // Bài của mình thì chắc chắn được xóa
                onView={() => navigate(`/ideas/${idea._id}`)}
                onEdit={() => openEdit(idea)}
                onDelete={() => { setSelected(idea); setFormError(""); setModal("delete"); }}
              />
            ))}
          </div>

          {/* Pagination */}
          {!loading && ideas.length > 0 && (
            <div className="flex flex-wrap items-center justify-between mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
              <span className="text-sm text-slate-600 font-medium ml-2">
                Trang {pagination.page} / {totalPages || 1}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => fetchMyIdeas(pagination.page - 1)} disabled={pagination.page <= 1} className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors">‹</button>
                <button onClick={() => fetchMyIdeas(pagination.page + 1)} disabled={pagination.page >= totalPages} className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors">›</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals (Dùng chung với Ideas.jsx) */}
      {modal === "edit" && (
        <Overlay onClose={closeModal}>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Idea</h2>
          {formError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">{formError}</div>}
          <form onSubmit={handleEdit} className="space-y-4">
            <MField label="Title *"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></MField>
            <MField label="Content *"><textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={4} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" /></MField>
            <div className="grid grid-cols-2 gap-4">
              <MField label="Topic Type">
                <select value={form.topicType} onChange={e => setForm({ ...form, topicType: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {user?.role === "Support Staff" ? <option value="Support">Support</option> : <><option value="Academic">Academic</option><option value="Support">Support</option></>}
                </select>
              </MField>
              <MField label="Category">
                <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">-- None --</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </MField>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={closeModal} className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
              <button type="submit" disabled={formLoading} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">{formLoading ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </Overlay>
      )}

      {modal === "delete" && (
        <Overlay onClose={closeModal}>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Idea</h2>
          <p className="text-slate-600 text-sm mb-6">Are you sure you want to delete <strong className="text-slate-900">"{selected?.title}"</strong>?</p>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={formLoading} className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">{formLoading ? "Deleting..." : "Delete"}</button>
          </div>
        </Overlay>
      )}
    </Layout>
  );
}

// ─────────────────────────────────────────────
// COMPONENT IDEACARD
// ─────────────────────────────────────────────
function IdeaCard({ idea, tc, isLast, canEdit, canDelete, onView, onEdit, onDelete }) {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;
  const [liked, setLiked] = useState(idea.likes?.includes(currentUserId) || false);
  const [likeCount, setLikeCount] = useState(idea.votes || 0);

  useEffect(() => {
    setLiked(idea.likes?.includes(currentUserId) || false);
    setLikeCount(idea.votes || 0);
  }, [idea.likes, idea.votes, currentUserId]);

  const handleLike = async (e) => {
    e.stopPropagation();
    const originalLiked = liked;
    const originalCount = likeCount;
    setLiked(!originalLiked);
    setLikeCount(originalLiked ? originalCount - 1 : originalCount + 1);
    try { await api.put(`/ideas/${idea._id}/like`); } 
    catch (error) { setLiked(originalLiked); setLikeCount(originalCount); }
  };

  const timeAgo = (date) => {
    const d = Math.floor((Date.now() - new Date(date)) / 1000);
    if (d < 3600) return `${Math.floor(d / 60)} minutes ago`;
    if (d < 86400) return `${Math.floor(d / 3600)} hours ago`;
    return `${Math.floor(d / 86400)} day${Math.floor(d / 86400) > 1 ? "s" : ""} ago`;
  };

  return (
    <div className={`flex bg-white hover:bg-slate-50 transition-colors cursor-pointer ${!isLast ? 'border-b border-slate-200' : ''}`} onClick={onView}>
      <div className="flex-1 p-5 min-w-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shadow-sm border border-blue-200">
              {(idea.isAnonymous ? "A" : (idea.authorId?.name?.[0] || "U")).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">{idea.isAnonymous ? "Anonymous (You)" : (idea.authorId?.name || "Unknown")}</p>
              <p className="text-xs text-slate-500 mt-0.5">{timeAgo(idea.createdAt)}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${tc(idea.topicType).bg} ${tc(idea.topicType).text}`}>{idea.topicType}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-slate-900 leading-snug">{idea.title}</h3>
            {idea.campaignId?.name && (
                <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 border border-purple-200 rounded-md flex items-center gap-1 shadow-sm">
                    🚀 {idea.campaignId.name}
                </span>
            )}
        </div>
        <p className="text-sm text-slate-600 line-clamp-2 mb-5 leading-relaxed">{idea.content}</p>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
          <div className="flex items-center gap-6">
            <button onClick={handleLike} className="flex items-center gap-1.5 group transition-colors">
              <Heart size={22} className={`transition-all duration-300 ${liked ? 'fill-red-500 text-red-500 scale-110' : 'text-slate-400 group-hover:text-red-500'}`} />
              <span className={`text-sm font-semibold ${liked ? 'text-red-500' : 'text-slate-500 group-hover:text-red-500'}`}>{likeCount}</span>
            </button>
            <div className="flex items-center gap-1.5 text-slate-400 hover:text-blue-500 transition-colors">
              <MessageCircle size={22} />
              <span className="text-sm font-semibold">{idea.commentsCount ?? idea.comments?.length ?? 0}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Eye size={22} /><span className="text-sm font-semibold">{idea.views || 0}</span>
            </div>
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <button className="text-slate-400 hover:text-slate-600 p-1.5"><Share2 size={18} /></button>
            {(canEdit || canDelete) && (
              <div className="flex gap-2 ml-2 pl-2 border-l border-slate-200">
                {canEdit && <button onClick={onEdit} className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors">Edit</button>}
                {canDelete && <button onClick={onDelete} className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-red-50 hover:text-red-600 transition-colors">Delete</button>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">{children}</div>
    </div>
  );
}

function MField({ label, children }) {
  return <div className="mb-4"><label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>{children}</div>;
}