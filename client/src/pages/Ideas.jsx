import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import { Heart, MessageCircle, Eye, Share2 } from "lucide-react";
import { socket } from "../App";

const CAN_POST = ["Academic Staff", "Support Staff"];
const CAN_DELETE_ANY = ["QA Coordinator", "QA Manager", "Administrator"];
const TABS = ["Most Popular", "Most Viewed", "Latest Ideas", "Latest Comments"];
const TOPIC_COLORS = {
  Academic: { bg: "bg-blue-50", text: "text-blue-600" },
  Support: { bg: "bg-green-50", text: "text-green-600" },
  "Campus Life": { bg: "bg-yellow-50", text: "text-yellow-600" },
  Facilities: { bg: "bg-emerald-50", text: "text-emerald-700" },
};

export default function Ideas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canPost = CAN_POST.includes(user?.role);

  const [ideas, setIdeas] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 5 });
  const [activeTab, setActiveTab] = useState("Most Popular");
  const [filterCategory, setFilterCategory] = useState("All Categories");
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState(null); // "edit" | "delete"
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchIdeas = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 5 });

      // 1. Nếu có gõ tìm kiếm
      if (searchQ) params.set("search", searchQ);

      // 2. Nếu có chọn Category (Khác "All Categories")
      if (filterCategory !== "All Categories") {
        params.set("category", filterCategory);
      }

      // 3. XỬ LÝ CÁC TAB (Truyền lệnh sort xuống Backend)
      if (activeTab === "Most Popular") params.set("sortBy", "popular"); // Sắp xếp theo votes
      if (activeTab === "Most Viewed") params.set("sortBy", "viewed");   // Sắp xếp theo views
      if (activeTab === "Latest Ideas") params.set("sortBy", "latest");  // Sắp xếp theo ngày tạo (Mới nhất)
      if (activeTab === "Most Comments") params.set("sortBy", "comments"); // Sắp xếp theo bình luận

      const { data } = await api.get(`/ideas?${params}`);
      setIdeas(data.ideas || []);
      setPagination({ ...data.pagination, page });
    } catch {
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  }, [searchQ, filterCategory, activeTab]); // <--- Đưa state vào mảng phụ thuộc

  // Gọi API lại ngay lập tức (và đưa về trang 1) mỗi khi user chuyển Tab hoặc đổi Category
  useEffect(() => {
    fetchIdeas(1);
  }, [fetchIdeas, activeTab, filterCategory]);

  useEffect(() => {
    api.get("/categories").then(({ data }) => setCategories(data.categories || [])).catch(() => { });
  }, []);

  // 🚀 BỘ THU SÓNG REAL-TIME
  useEffect(() => {
    // 1. Cập nhật lượt Tim
    socket.on("global_update_likes", (data) => {
      setIdeas(prev => prev.map(item =>
        item._id === data.ideaId
          ? { ...item, votes: data.newVotes, likes: data.likes }
          : item
      ));
    });

    // 2. Cập nhật số lượng Bình luận
    socket.on("global_update_comments", (data) => {
      setIdeas(prev => prev.map(item =>
        item._id === data.ideaId
          ? { ...item, commentsCount: data.commentCount }
          : item
      ));
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
      closeModal(); fetchIdeas();
    } catch (err) { setFormError(err.response?.data?.message || "Failed to update."); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await api.delete(`/ideas/${selected._id}`);
      closeModal(); fetchIdeas();
    } catch (err) { setFormError(err.response?.data?.message || "Failed to delete."); }
    finally { setFormLoading(false); }
  };

  const openEdit = (idea) => {
    setSelected(idea);
    setForm({ title: idea.title, content: idea.content, topicType: idea.topicType, isAnonymous: idea.isAnonymous, closureDate: idea.closureDate ? idea.closureDate.slice(0, 10) : "", categoryId: idea.categoryId || "" });
    setFormError(""); setModal("edit");
  };

  const isOwner = (idea) => idea.authorId?._id === user?._id || idea.authorId === user?._id;
  const canDeleteIdea = (idea) => isOwner(idea) || CAN_DELETE_ANY.includes(user?.role);
  const totalPages = Math.ceil((pagination.total || 0) / 5);

  const tc = (type) => TOPIC_COLORS[type] || { bg: "bg-gray-100", text: "text-gray-600" };

  return (
    <Layout>
      <Topbar
        title="Idea Dashboard"
        onSearch={setSearchQ}
        showNewIdea={canPost}
        onNewIdea={() => navigate('/submit-idea')}
      />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Tabs & Filters */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 mb-6 gap-4">
          <div className="flex items-center gap-6">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 pb-3">
            <span className="text-sm font-medium text-slate-500">Filter by:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
            >
              <option>All Categories</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Ideas list */}
        <div className="flex flex-col rounded-xl overflow-hidden border border-slate-200 shadow-sm">
          {loading ? (
            <div className="text-center py-16 text-slate-500 font-medium bg-white">Loading ideas...</div>
          ) : ideas.length === 0 ? (
            <div className="text-center py-16 bg-white">
              <div className="text-5xl mb-4">💡</div>
              <div className="text-slate-500 font-medium">No ideas found.</div>
            </div>
          ) : ideas.map((idea, idx) => (
            <IdeaCard
              key={idea._id}
              idea={idea}
              tc={tc}
              isLast={idx === ideas.length - 1}
              canEdit={isOwner(idea)}
              canDelete={canDeleteIdea(idea)}
              onView={() => navigate(`/ideas/${idea._id}`)}
              onEdit={() => openEdit(idea)}
              onDelete={() => { setSelected(idea); setFormError(""); setModal("delete"); }}
            />
          ))}
        </div>

        {/* Pagination */}
        {!loading && ideas.length > 0 && (
          <div className="flex flex-wrap items-center justify-between mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
            <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
              Items per page:
              <select className="border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                <option>5</option><option>10</option>
              </select>
              <span className="ml-2">
                {(pagination.page - 1) * 5 + 1}–{Math.min(pagination.page * 5, pagination.total)} of {pagination.total} items
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchIdeas(pagination.page - 1)} disabled={pagination.page <= 1} className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors">‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchIdeas(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${p === pagination.page ? 'bg-blue-600 text-white border border-blue-600 shadow-sm' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {p}
                </button>
              ))}
              {totalPages > 5 && <span className="text-slate-500">...</span>}
              <button onClick={() => fetchIdeas(pagination.page + 1)} disabled={pagination.page >= totalPages} className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors">›</button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {modal === "edit" && (
        <Overlay onClose={closeModal}>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Idea</h2>
          {formError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">{formError}</div>}
          <form onSubmit={handleEdit} className="space-y-4">
            <MField label="Title *">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </MField>
            <MField label="Content *">
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={4} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
            </MField>
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
              <button type="submit" disabled={formLoading} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {formLoading ? "Saving..." : "Save Changes"}
              </button>
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
            <button onClick={handleDelete} disabled={formLoading} className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
              {formLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Overlay>
      )}
    </Layout>
  );
}

// ─────────────────────────────────────────────
// COMPONENT IDEACARD ĐÃ ĐƯỢC TỐI ƯU HÓA
// ─────────────────────────────────────────────
function IdeaCard({ idea, tc, isLast, canEdit, canDelete, onView, onEdit, onDelete }) {
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  // Khởi tạo state bằng dữ liệu gốc
  const [liked, setLiked] = useState(idea.likes?.includes(currentUserId) || false);
  const [likeCount, setLikeCount] = useState(idea.votes || 0);

  // 🚀 ĐỒNG BỘ STATE: Tự động cập nhật nếu dữ liệu (từ Socket) thay đổi
  useEffect(() => {
    setLiked(idea.likes?.includes(currentUserId) || false);
    setLikeCount(idea.votes || 0);
  }, [idea.likes, idea.votes, currentUserId]);

  const handleLike = async (e) => {
    e.stopPropagation();

    // Lưu lại giá trị cũ để dự phòng (Optimistic UI)
    const originalLiked = liked;
    const originalCount = likeCount;

    // Cho số nhảy trước lập tức để trải nghiệm mượt mà
    setLiked(!originalLiked);
    setLikeCount(originalLiked ? originalCount - 1 : originalCount + 1);

    try {
      await api.put(`/ideas/${idea._id}/like`);
    } catch (error) {
      // Nếu API lỗi, trả lại trạng thái cũ
      setLiked(originalLiked);
      setLikeCount(originalCount);
    }
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
              <p className="text-sm font-bold text-slate-800 leading-tight">{idea.isAnonymous ? "Anonymous" : (idea.authorId?.name || "Unknown")}</p>
              <p className="text-xs text-slate-500 mt-0.5">{timeAgo(idea.createdAt)}</p>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs font-bold rounded-full ${tc(idea.topicType).bg} ${tc(idea.topicType).text}`}>{idea.topicType}</span>
        </div>

        {/* TIÊU ĐỀ VÀ NHÃN CHIẾN DỊCH */}
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
              {/* ĐÃ SỬA: Dùng commentsCount từ Socket, nếu không có thì dùng chiều dài mảng */}
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
      <div className="bg-white rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  );
}

function MField({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}