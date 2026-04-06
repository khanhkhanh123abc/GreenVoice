import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/common/Layout";
import {
  Heart, MessageCircle, Eye, ArrowLeft, Paperclip, Send,
  Trash2, BookOpen, User, Flag, X
} from "lucide-react";
import {
  getMaterialById, toggleLikeMaterial,
  addCommentMaterial, deleteCommentMaterial
} from "../../api/learningMaterialAPI";
import { createReport } from "../../api/reportAPI";

export default function LearningMaterialDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnon, setIsAnon] = useState(false);
  const [commenting, setCommenting] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ title: "", content: "" });
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  // Check localStorage so state persists across pages
  const [hasReported, setHasReported] = useState(() => {
    try {
      const stored = localStorage.getItem("reportedMaterialIds");
      const ids = stored ? JSON.parse(stored) : [];
      return ids.includes(id);
    } catch { return false; }
  });
  const isQAC = user?.role === "QA Coordinator";

  const currentUserId = user?._id || user?.id;

  const fetchMaterial = async () => {
    setLoading(true);
    try {
      const { data } = await getMaterialById(id);
      setMaterial(data);
      setLiked(data.likes?.some(lid => lid === currentUserId || lid?._id === currentUserId) || false);
      setLikeCount(data.likes?.length || 0);
    } catch { navigate("/learning-materials"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMaterial(); }, [id]);

  const handleLike = async () => {
    const orig = { liked, likeCount };
    setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try {
      const { data } = await toggleLikeMaterial(id);
      setLikeCount(data.likesCount);
      setLiked(data.likes?.some(lid => lid === currentUserId || lid?._id === currentUserId));
    } catch { setLiked(orig.liked); setLikeCount(orig.likeCount); }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    try {
      await addCommentMaterial(id, { content: comment, isAnonymous: isAnon });
      setComment("");
      fetchMaterial();
    } catch { } finally { setCommenting(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteCommentMaterial(id, commentId);
      fetchMaterial();
    } catch { }
  };

  const openReportModal = () => {
    // If already reported this session, show inline message
    if (hasReported) {
      alert("Report has been submitted.");
      return;
    }
    setReportForm({ title: `Report: ${material?.title || ""}`, content: "" });
    setReportError("");
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setReportError(""); setReportLoading(true);
    try {
      await createReport({
        title: reportForm.title,
        content: reportForm.content,
        type: "learning_material",
        targetId: id,
      });
      // Save to localStorage so LearningMaterials page also knows
      const stored = localStorage.getItem("reportedMaterialIds");
      const ids = stored ? JSON.parse(stored) : [];
      if (!ids.includes(id)) {
        localStorage.setItem("reportedMaterialIds", JSON.stringify([...ids, id]));
      }
      setHasReported(true);
      setShowReportModal(false);
    } catch (err) {
      setReportError(err.response?.data?.message || "Failed to submit report.");
    } finally { setReportLoading(false); }
  };

  const timeAgo = (date) => {
    const d = Math.floor((Date.now() - new Date(date)) / 1000);
    if (d < 3600) return `${Math.floor(d / 60)} minutes ago`;
    if (d < 86400) return `${Math.floor(d / 3600)} hours ago`;
    return `${Math.floor(d / 86400)} days ago`;
  };

  const tc = material?.materialType === "Academic"
    ? { bg: "bg-blue-50", text: "text-blue-600" }
    : { bg: "bg-emerald-50", text: "text-emerald-600" };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse flex flex-col gap-4 w-full max-w-2xl mx-auto p-8">
            <div className="h-6 bg-slate-200 rounded w-1/3" />
            <div className="h-8 bg-slate-200 rounded w-2/3" />
            <div className="h-40 bg-slate-200 rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">

          {/* Back */}
          <button onClick={() => navigate("/learning-materials")} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors mb-6 group">
            <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Materials
          </button>

          {/* Card */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

            {/* Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    {material?.authorId?.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{material?.authorId?.name || "Unknown"}</p>
                    <p className="text-xs text-slate-400">{material?.authorId?.role} · {timeAgo(material?.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${tc.bg} ${tc.text}`}>
                    {material?.materialType}
                  </span>
                  {isQAC && (
                    <button
                      onClick={openReportModal}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                        hasReported
                          ? "text-slate-400 bg-slate-100 border-slate-200 cursor-default"
                          : "text-red-600 bg-red-50 border-red-200 hover:bg-red-100"
                      }`}
                      title={hasReported ? "Already reported" : "Report this material"}
                    >
                      <Flag size={12} /> {hasReported ? "Reported" : "Report"}
                    </button>
                  )}
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">{material?.title}</h1>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">{material?.content}</p>
            </div>

            {/* Attachments */}
            {material?.documents?.length > 0 && (
              <div className="px-6 pb-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Attachments</p>
                <div className="flex flex-wrap gap-2">
                  {material.documents.map((doc, i) => (
                    <a
                      key={i}
                      href={`http://localhost:3000/uploads/${doc}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors"
                    >
                      <Paperclip size={12} />
                      {doc.split("-").slice(1).join("-") || doc}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Stats & Like */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-6">
              <button onClick={handleLike} className="flex items-center gap-2 group/like transition-colors">
                <Heart size={20} className={`transition-all duration-200 ${liked ? "fill-red-500 text-red-500 scale-110" : "text-slate-400 group-hover/like:text-red-400"}`} />
                <span className={`text-sm font-semibold ${liked ? "text-red-500" : "text-slate-500"}`}>{likeCount} Likes</span>
              </button>
              <div className="flex items-center gap-2 text-slate-400">
                <MessageCircle size={20} />
                <span className="text-sm font-semibold">{material?.comments?.length || 0} Comments</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Eye size={20} />
                <span className="text-sm font-semibold">{material?.views || 0} Views</span>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="mt-6">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageCircle size={18} className="text-blue-500" />
              Comments ({material?.comments?.length || 0})
            </h2>

            {/* Comment form */}
            <form onSubmit={handleComment} className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-sm">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Write a comment..."
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none transition-shadow"
              />
              <div className="flex items-center justify-between mt-3">
                <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
                  <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} className="rounded" />
                  <User size={14} />
                  Post anonymously
                </label>
                <button type="submit" disabled={commenting || !comment.trim()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
                  <Send size={14} />
                  {commenting ? "Posting..." : "Post"}
                </button>
              </div>
            </form>

            {/* Comment list */}
            {material?.comments?.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm font-medium">No comments yet. Be the first!</div>
            ) : (
              <div className="flex flex-col gap-3">
                {material.comments.map(c => {
                  const isCommentOwner = c.authorId?._id === currentUserId;
                  const isAdmin = user?.role === "Administrator";
                  return (
                    <div key={c._id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 group">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {c.isAnonymous ? "?" : (c.authorId?.name?.[0]?.toUpperCase() || "?")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-bold text-slate-700">
                            {c.isAnonymous ? "Anonymous" : (c.authorId?.name || "Unknown")}
                            {c.authorId?.role && !c.isAnonymous && <span className="ml-1.5 text-[10px] font-normal text-slate-400">· {c.authorId.role}</span>}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-400">{timeAgo(c.createdAt)}</span>
                            {(isCommentOwner || isAdmin) && (
                              <button onClick={() => handleDeleteComment(c._id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── REPORT MODAL ── */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowReportModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Flag size={18} className="text-red-500" /> Report Learning Material
              </h2>
              <button onClick={() => setShowReportModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Material name preview */}
            <div className="mb-4 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Material: </span>{material?.title}
            </div>

            {reportError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">{reportError}</div>
            )}

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Report Title *</label>
                <input
                  value={reportForm.title}
                  onChange={e => setReportForm({ ...reportForm, title: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description of the issue"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Detailed Description *</label>
                <textarea
                  value={reportForm.content}
                  onChange={e => setReportForm({ ...reportForm, content: e.target.value })}
                  required
                  rows={5}
                  placeholder="Describe the issue in detail..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowReportModal(false)} className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={reportLoading} className="px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {reportLoading ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}