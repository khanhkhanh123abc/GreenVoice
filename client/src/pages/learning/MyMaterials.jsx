import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axiosInstance";
import Layout from "../../components/common/Layout";
import Topbar from "../../components/navigation/Topbar";
import { Heart, MessageCircle, Eye, BookOpen, Pencil, Trash2 } from "lucide-react";
import { toast } from "react-toastify";

const TYPE_COLORS = {
  Academic: { bg: "bg-blue-50",  text: "text-blue-600",  border: "border-blue-200" },
  Support:  { bg: "bg-green-50", text: "text-green-600", border: "border-green-200" },
};

export default function MyMaterials() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [materials, setMaterials]   = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 8 });
  const [searchQ, setSearchQ]       = useState("");
  const [loading, setLoading]       = useState(true);

  const [modal, setModal]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [form, setForm]             = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError]   = useState("");

  const fetchMyMaterials = useCallback(async (page = 1) => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 8 });
      if (searchQ) params.set("search", searchQ);
      params.set("author", user._id || user.id);
      const { data } = await api.get(`/learning-materials?${params}`);
      setMaterials(data.materials || []);
      setPagination({ ...data.pagination, page });
    } catch {
      setMaterials([]);
      toast.error("Failed to load your materials.");
    } finally { setLoading(false); }
  }, [searchQ, user]);

  useEffect(() => { fetchMyMaterials(); }, [fetchMyMaterials]);

  const closeModal = () => { setModal(null); setSelected(null); setFormError(""); };

  const handleEdit = async (e) => {
    e.preventDefault(); setFormError(""); setFormLoading(true);
    try {
      await api.put(`/learning-materials/${selected._id}`, {
        title: form.title,
        content: form.content,
      });
      closeModal();
      fetchMyMaterials(pagination.page);
      toast.success("Material updated successfully!");
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to update.");
    } finally { setFormLoading(false); }
  };

  const handleDelete = async () => {
    setFormLoading(true);
    try {
      await api.delete(`/learning-materials/${selected._id}`);
      closeModal();
      fetchMyMaterials(1);
      toast.success("Material deleted.");
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to delete.");
    } finally { setFormLoading(false); }
  };

  const openEdit = (mat) => {
    setSelected(mat);
    setForm({ title: mat.title, content: mat.content });
    setFormError("");
    setModal("edit");
  };

  const totalPages = Math.ceil((pagination.total || 0) / 8);

  const timeAgo = (date) => {
    const d = Math.floor((Date.now() - new Date(date)) / 1000);
    if (d < 3600)  return `${Math.floor(d / 60)} minutes ago`;
    if (d < 86400) return `${Math.floor(d / 3600)} hours ago`;
    return `${Math.floor(d / 86400)} day${Math.floor(d / 86400) > 1 ? "s" : ""} ago`;
  };

  return (
    <Layout>
      <Topbar title="My Materials" onSearch={setSearchQ} />

      <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-4xl mx-auto w-full">

          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">
              My Materials ({pagination.total})
            </h2>
          </div>

          {/* List */}
          <div className="flex flex-col rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            {loading ? (
              <div className="text-center py-16 text-slate-500 font-medium bg-white">
                Loading your materials...
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-16 bg-white flex flex-col items-center">
                <BookOpen size={48} className="text-slate-300 mb-4" />
                <div className="text-slate-500 font-medium mb-4">
                  You have not posted any materials yet.
                </div>
                <button
                  onClick={() => navigate("/learning-materials")}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  Go to Learning Materials
                </button>
              </div>
            ) : materials.map((mat, idx) => {
              const tc = TYPE_COLORS[mat.materialType] || { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
              return (
                <div
                  key={mat._id}
                  className={`flex bg-white hover:bg-slate-50 transition-colors cursor-pointer ${idx !== materials.length - 1 ? "border-b border-slate-200" : ""}`}
                  onClick={() => navigate(`/learning-materials/${mat._id}`)}
                >
                  <div className="flex-1 p-5 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold shadow-sm border border-blue-200">
                          {mat.authorId?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">
                            {mat.authorId?.name || "You"}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{timeAgo(mat.createdAt)}</p>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {mat.reviewStatus === "pending" && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                            ⏳ Pending review
                          </span>
                        )}
                        {mat.status === "archived" && (
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                            Archived
                          </span>
                        )}
                        <span className={`px-3 py-1 text-xs font-bold rounded-full border ${tc.bg} ${tc.text} ${tc.border}`}>
                          {mat.materialType}
                        </span>
                      </div>
                    </div>

                    {/* Title + content */}
                    <h3 className="text-lg font-bold text-slate-900 leading-snug mb-1">{mat.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">{mat.content}</p>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Heart size={18} />
                          <span className="text-sm font-semibold">{mat.likes?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <MessageCircle size={18} />
                          <span className="text-sm font-semibold">{mat.comments?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Eye size={18} />
                          <span className="text-sm font-semibold">{mat.views || 0}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-2 pl-2 border-l border-slate-200">
                          <button
                            onClick={() => openEdit(mat)}
                            className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center gap-1"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button
                            onClick={() => { setSelected(mat); setFormError(""); setModal("delete"); }}
                            className="text-xs font-bold px-3 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-1"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {!loading && materials.length > 0 && (
            <div className="flex flex-wrap items-center justify-between mt-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
              <span className="text-sm text-slate-600 font-medium ml-2">
                Page {pagination.page} / {totalPages || 1}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchMyMaterials(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >‹</button>
                <button
                  onClick={() => fetchMyMaterials(pagination.page + 1)}
                  disabled={pagination.page >= totalPages}
                  className="w-8 h-8 flex items-center justify-center border border-slate-300 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >›</button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {modal === "edit" && (
        <Overlay onClose={closeModal}>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Edit Material</h2>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">
              {formError}
            </div>
          )}
          <form onSubmit={handleEdit} className="space-y-4">
            <MField label="Title *">
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </MField>
            <MField label="Content *">
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                required
                rows={5}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </MField>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {formLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Overlay>
      )}

      {/* Delete Modal */}
      {modal === "delete" && (
        <Overlay onClose={closeModal}>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Delete Material</h2>
          <p className="text-slate-600 text-sm mb-6">
            Are you sure you want to delete{" "}
            <strong className="text-slate-900">"{selected?.title}"</strong>?
            This action cannot be undone.
          </p>
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg mb-4">
              {formError}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={closeModal}
              className="px-5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={formLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {formLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Overlay>
      )}
    </Layout>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
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
