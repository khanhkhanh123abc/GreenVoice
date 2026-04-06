import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/common/Layout";
import Topbar from "../../components/navigation/Topbar";
import { toast } from "react-toastify";
import {
  Heart, MessageCircle, Eye, BookOpen, Plus, Pencil, Trash2,
  Archive, ArchiveRestore, X, Upload, ChevronLeft, ChevronRight, Flag
} from "lucide-react";
import {
  getAllMaterials, createMaterial, updateMaterial,
  deleteMaterial, toggleLikeMaterial, toggleArchiveMaterial
} from "../../api/learningMaterialAPI";
import { createReport } from "../../api/reportAPI";
import { socket } from "../../App";

const STAFF_ROLES = ["Academic Staff", "Support Staff"];
const TYPE_COLORS = {
  Academic: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" },
  Support: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
};

export default function LearningMaterials() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = STAFF_ROLES.includes(user?.role);
  const isAdmin = user?.role === "Administrator";
  const isQAC = user?.role === "QA Coordinator";

  const [materials, setMaterials] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 8 });
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState("");

  const [modal, setModal] = useState(null); // "create" | "edit" | "delete" | "report"
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: "", content: "", materialType: isStaff ? (user.role === "Support Staff" ? "Support" : "Academic") : "Academic", categoryId: "" });
  const [reportForm, setReportForm] = useState({ title: "", content: "" });
  // Load reported IDs from localStorage so it persists across pages
  const [reportedIds, setReportedIds] = useState(() => {
    try {
      const stored = localStorage.getItem("reportedMaterialIds");
      return new Set(stored ? JSON.parse(stored) : []);
    } catch { return new Set(); }
  });
  const [files, setFiles] = useState([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const fetchMaterials = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 8 };
      if (filterType) params.materialType = filterType;
      const { data } = await getAllMaterials(params);
      setMaterials(data.materials || []);
      setPagination({ ...data.pagination, page });
    } catch { setMaterials([]); }
    finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchMaterials(1); }, [fetchMaterials]);

  useEffect(() => {
    socket.on("global_update_material_likes", ({ materialId, likes }) => {
      setMaterials(prev => prev.map(m => m._id === materialId ? { ...m, likes } : m));
    });
    socket.on("global_update_material_comments", ({ materialId, commentCount }) => {
      setMaterials(prev => prev.map(m => m._id === materialId ? { ...m, _commentCount: commentCount } : m));
    });
    return () => {
      socket.off("global_update_material_likes");
      socket.off("global_update_material_comments");
    };
  }, []);

  const closeModal = () => { setModal(null); setSelected(null); setFormError(""); setFiles([]); };

  const handleCreate = async (e) => {
    e.preventDefault(); setFormError(""); setFormLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("content", form.content);
      fd.append("materialType", form.materialType);
      if (form.categoryId) fd.append("categoryId", form.categoryId);
      files.forEach(f => fd.append("documents", f));
      await createMaterial(fd);
      closeModal(); fetchMaterials(1);
    } catch (err) { setFormError(err.response?.data?.message || "Failed to create."); }
    finally { setFormLoading(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault(); setFormError(""); setFormLoading(true);
    try {
      await updateMaterial(selected._id, { title: form.title, content: form.content });
      closeModal(); fetchMaterials(pagination.page);
    } catch (err) { setFormError(err.response?.data?.message || "Failed to update."); }
    finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await deleteMaterial(selected._id);
      closeModal(); fetchMaterials(1);
    } catch (err) { setFormError(err.response?.data?.message || "Failed to delete."); }
    finally { setFormLoading(false); }
  };

  const handleArchive = async (id) => {
    try { await toggleArchiveMaterial(id); fetchMaterials(pagination.page); } catch { }
  };

  const openReportModal = (mat) => {
    // If already reported, show toast instead of modal
    if (reportedIds.has(mat._id)) {
      toast.info("Report has been submitted.");
      return;
    }
    setSelected(mat);
    setReportForm({ title: `Report: ${mat.title}`, content: "" });
    setFormError("");
    setModal("report");
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setFormError(""); setFormLoading(true);
    try {
      await createReport({
        title: reportForm.title,
        content: reportForm.content,
        type: "learning_material",
        targetId: selected._id,
      });
      // Mark this material as reported — save to localStorage
      const newSet = new Set([...reportedIds, selected._id]);
      setReportedIds(newSet);
      localStorage.setItem("reportedMaterialIds", JSON.stringify([...newSet]));
      toast.success("Report submitted successfully!");
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to submit report.");
    } finally { setFormLoading(false); }
  };

  const openEdit = (mat) => {
    setSelected(mat);
    setForm({ title: mat.title, content: mat.content, materialType: mat.materialType, categoryId: mat.categoryId || "" });
    setFormError(""); setModal("edit");
  };

  const totalPages = Math.ceil((pagination.total || 0) / 8);
  const isOwner = (mat) => mat.authorId?._id === user?._id || mat.authorId === user?._id;

  return (
    <Layout>
      <Topbar
        title="Learning Materials"
        onSearch={setSearchQ}
        showNewIdea={isStaff}
        onNewIdea={() => { setForm({ title: "", content: "", materialType: user.role === "Support Staff" ? "Support" : "Academic", categoryId: "" }); setFiles([]); setFormError(""); setModal("create"); }}
        newIdeaLabel="Create Material"
      />

      <main className="flex-1 p-8 overflow-y-auto">

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-semibold text-slate-500">Filter by type:</span>
          {["", "Academic", "Support"].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${filterType === t ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"}`}
            >
              {t || "All"}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400 font-medium">{pagination.total} materials</span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/4 mb-3" />
                <div className="h-5 bg-slate-100 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-100 rounded w-full mb-1" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <BookOpen size={48} className="mb-4 opacity-30" />
            <p className="font-semibold text-lg">No learning materials yet</p>
            {isStaff && <p className="text-sm mt-1">Be the first to post one!</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map(mat => (
              <MaterialCard
                key={mat._id}
                mat={mat}
                user={user}
                isOwner={isOwner(mat)}
                isAdmin={isAdmin}
                isQAC={isQAC}
                onView={() => navigate(`/learning-materials/${mat._id}`)}
                onEdit={() => openEdit(mat)}
                onDelete={() => { setSelected(mat); setFormError(""); setModal("delete"); }}
                onArchive={() => handleArchive(mat._id)}
                onReport={() => openReportModal(mat)}
                onLikeUpdate={(likes) => setMaterials(prev => prev.map(m => m._id === mat._id ? { ...m, likes } : m))}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-sm text-slate-500 font-medium">
              {(pagination.page - 1) * 8 + 1}–{Math.min(pagination.page * 8, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => fetchMaterials(pagination.page - 1)} disabled={pagination.page <= 1} className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => fetchMaterials(p)} className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${p === pagination.page ? "bg-blue-600 text-white border border-blue-600" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{p}</button>
              ))}
              <button onClick={() => fetchMaterials(pagination.page + 1)} disabled={pagination.page >= totalPages} className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ── CREATE MODAL ── */}
      {modal === "create" && (
        <Overlay onClose={closeModal}>
          <ModalHeader title="New Learning Material" onClose={closeModal} />
          {formError && <ErrorBanner msg={formError} />}
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <Field label="Title *">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className={inputCls} placeholder="Enter a clear title..." />
            </Field>
            <Field label="Content *">
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={5} className={`${inputCls} resize-y`} placeholder="Write the learning material content..." />
            </Field>
            <Field label="Type">
              <div className={`px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm font-semibold ${TYPE_COLORS[form.materialType]?.text}`}>
                {form.materialType}
              </div>
            </Field>
            <Field label="Attach files (optional)">
              <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                <Upload size={16} className="text-slate-400" />
                <span className="text-sm text-slate-500">{files.length > 0 ? `${files.length} file(s) selected` : "Click to upload files"}</span>
                <input type="file" multiple className="hidden" onChange={e => setFiles(Array.from(e.target.files))} />
              </label>
            </Field>
            <ModalActions onCancel={closeModal} loading={formLoading} label="Publish" />
          </form>
        </Overlay>
      )}

      {/* ── EDIT MODAL ── */}
      {modal === "edit" && (
        <Overlay onClose={closeModal}>
          <ModalHeader title="Edit Material" onClose={closeModal} />
          {formError && <ErrorBanner msg={formError} />}
          <form onSubmit={handleEdit} className="space-y-4 mt-4">
            <Field label="Title *">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className={inputCls} />
            </Field>
            <Field label="Content *">
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required rows={5} className={`${inputCls} resize-y`} />
            </Field>
            <ModalActions onCancel={closeModal} loading={formLoading} label="Save Changes" />
          </form>
        </Overlay>
      )}

      {/* ── DELETE MODAL ── */}
      {modal === "delete" && (
        <Overlay onClose={closeModal}>
          <ModalHeader title="Delete Material" onClose={closeModal} />
          {formError && <ErrorBanner msg={formError} />}
          <p className="text-sm text-slate-600 mt-4 mb-6">
            Are you sure you want to delete <strong className="text-slate-900">"{selected?.title}"</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button onClick={closeModal} className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
            <button onClick={handleDelete} disabled={formLoading} className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
              {formLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Overlay>
      )}
      {/* ── REPORT MODAL ── */}
      {modal === "report" && (
        <Overlay onClose={closeModal}>
          <ModalHeader title="Report Learning Material" onClose={closeModal} />
          {formError && <ErrorBanner msg={formError} />}
          <div className="mt-3 mb-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Material: </span>{selected?.title}
          </div>
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <Field label="Report Title *">
              <input
                value={reportForm.title}
                onChange={e => setReportForm({ ...reportForm, title: e.target.value })}
                required
                className={inputCls}
                placeholder="Brief description of the issue"
              />
            </Field>
            <Field label="Detailed Description *">
              <textarea
                value={reportForm.content}
                onChange={e => setReportForm({ ...reportForm, content: e.target.value })}
                required
                rows={5}
                placeholder="Describe the issue in detail..."
                className={`${inputCls} resize-y`}
              />
            </Field>
            <ModalActions onCancel={closeModal} loading={formLoading} label="Submit Report" color="bg-red-600 hover:bg-red-700" />
          </form>
        </Overlay>
      )}
    </Layout>
  );
}

// ── MATERIAL CARD ──
function MaterialCard({ mat, user, isOwner, isAdmin, isQAC, onView, onEdit, onDelete, onArchive, onReport, onLikeUpdate }) {
  const currentUserId = user?._id || user?.id;
  const [liked, setLiked] = useState(mat.likes?.some(id => id === currentUserId || id?._id === currentUserId) || false);
  const [likeCount, setLikeCount] = useState(mat.likes?.length || 0);

  useEffect(() => {
    setLiked(mat.likes?.some(id => id === currentUserId || id?._id === currentUserId) || false);
    setLikeCount(mat.likes?.length || 0);
  }, [mat.likes, currentUserId]);

  const handleLike = async (e) => {
    e.stopPropagation();
    const orig = { liked, likeCount };
    setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try {
      const { data } = await toggleLikeMaterial(mat._id);
      setLikeCount(data.likesCount);
      setLiked(data.likes?.some(id => id === currentUserId || id?._id === currentUserId));
      onLikeUpdate(data.likes);
    } catch { setLiked(orig.liked); setLikeCount(orig.likeCount); }
  };

  const tc = TYPE_COLORS[mat.materialType] || { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
  const isArchived = mat.status === "archived";
  const timeAgo = (date) => {
    const d = Math.floor((Date.now() - new Date(date)) / 1000);
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  return (
    <div
      onClick={onView}
      className={`group bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col gap-3 ${isArchived ? "opacity-60" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
            {mat.authorId?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 leading-tight">{mat.authorId?.name || "Unknown"}</p>
            <p className="text-[11px] text-slate-400">{timeAgo(mat.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isArchived && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full border border-slate-200">Archived</span>
          )}
          {mat.reviewStatus === "pending" && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full border border-orange-200">⏳ Pending</span>
          )}
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${tc.bg} ${tc.text} ${tc.border}`}>
            {mat.materialType}
          </span>
        </div>
      </div>

      {/* Body */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-1 leading-snug line-clamp-2 group-hover:text-blue-600 transition-colors">{mat.title}</h3>
        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{mat.content}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="flex items-center gap-1 group/like transition-colors">
            <Heart size={16} className={`transition-all ${liked ? "fill-red-500 text-red-500" : "text-slate-400 group-hover/like:text-red-400"}`} />
            <span className={`text-xs font-semibold ${liked ? "text-red-500" : "text-slate-400 group-hover/like:text-red-400"}`}>{likeCount}</span>
          </button>
          <div className="flex items-center gap-1 text-slate-400">
            <MessageCircle size={16} />
            <span className="text-xs font-semibold">{mat._commentCount ?? mat.comments?.length ?? 0}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Eye size={16} />
            <span className="text-xs font-semibold">{mat.views || 0}</span>
          </div>
        </div>

        {(isOwner || isAdmin || isQAC) && (
          <div className="flex items-center gap-1">
            {isOwner && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                <Pencil size={14} />
              </button>
            )}
            {isQAC && (
              <button onClick={(e) => { e.stopPropagation(); onReport(); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Report this material">
                <Flag size={14} />
              </button>
            )}
            {(isOwner || isAdmin) && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SHARED UI ──
const inputCls = "w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow";

function Overlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {children}
      </div>
    </div>
  );
}
function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
function ErrorBanner({ msg }) {
  return <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mt-3">{msg}</div>;
}
function ModalActions({ onCancel, loading, label, color = "bg-blue-600 hover:bg-blue-700" }) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
      <button type="button" onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
      <button type="submit" disabled={loading} className={`px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50 transition-colors ${color}`}>
        {loading ? "Saving..." : label}
      </button>
    </div>
  );
}