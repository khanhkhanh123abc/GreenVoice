import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import Layout from "../../components/common/Layout";
import api from "../../api/axiosInstance";
import { CheckCircle, XCircle, Clock, Bot, Eye, ChevronDown, ChevronUp } from "lucide-react";

export default function IdeaReview() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [note, setNote] = useState({});
  const [processing, setProcessing] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ideas/pending");
      setIdeas(data.ideas || []);
    } catch (err) {
      showToast("Failed to load pending ideas", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleReview = async (ideaId, action) => {
    setProcessing(ideaId + action);
    try {
      await api.patch("/ideas/" + ideaId + "/review", { action, note: note[ideaId] || "" });
      showToast(action === "approve" ? "✅ Idea approved!" : "❌ Idea rejected");
      setIdeas(prev => prev.filter(i => i._id !== ideaId));
    } catch (err) {
      showToast(err.response?.data?.message || "Error", "error");
    } finally { setProcessing(null); }
  };

  const confidenceColor = (c) => {
    if (c >= 0.8) return "text-green-600 bg-green-50";
    if (c >= 0.6) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <Layout>
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Clock size={24} className="text-orange-500" /> Pending Ideas Review
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              These ideas were flagged by AI for manual review. Approve or reject each one.
            </p>
          </div>

          {/* Toast */}
          {toast && (
            <div className={"fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium " +
              (toast.type === "error" ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200")}>
              {toast.msg}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-20 text-slate-400">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              Loading...
            </div>
          )}

          {/* Empty */}
          {!loading && ideas.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">No pending ideas!</p>
              <p className="text-slate-400 text-sm mt-1">All caught up 🎉</p>
            </div>
          )}

          {/* Idea list */}
          <div className="space-y-4">
            {ideas.map(idea => (
              <div key={idea._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                {/* Card header */}
                <div className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={"text-xs font-semibold px-2 py-0.5 rounded-full " +
                          (idea.topicType === "Academic" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
                          {idea.topicType}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">
                          ⏳ Pending
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-base">{idea.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        By {idea.isAnonymous ? "Anonymous" : idea.authorId?.name} ·{" "}
                        {new Date(idea.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* AI result badge */}
                    {idea.aiModeration?.checkedAt && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Bot size={14} className="text-purple-500" />
                        <span className={"text-xs font-semibold px-2 py-1 rounded-lg " + confidenceColor(idea.aiModeration.confidence)}>
                          AI: {idea.aiModeration.decision} ({Math.round((idea.aiModeration.confidence || 0) * 100)}%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* AI reason */}
                  {idea.aiModeration?.reason && (
                    <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 flex items-start gap-2">
                      <Bot size={12} className="text-purple-400 mt-0.5 shrink-0" />
                      <span><b>AI note:</b> {idea.aiModeration.reason}</span>
                    </div>
                  )}

                  {/* Expand/collapse content */}
                  <button
                    onClick={() => setExpanded(expanded === idea._id ? null : idea._id)}
                    className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <Eye size={13} />
                    {expanded === idea._id ? "Hide content" : "Read full content"}
                    {expanded === idea._id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {expanded === idea._id && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed border border-slate-100">
                      {idea.content}
                    </div>
                  )}
                </div>

                {/* Review actions */}
                <div className="border-t border-slate-100 p-4 bg-slate-50">
                  <textarea
                    placeholder="Add a note (optional)..."
                    value={note[idea._id] || ""}
                    onChange={e => setNote(prev => ({ ...prev, [idea._id]: e.target.value }))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white mb-3"
                    rows={2}
                  />
                  <div className="flex gap-2 justify-end flex-wrap">
                    <button
                      onClick={() => handleReview(idea._id, "reject")}
                      disabled={processing === idea._id + "reject"}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition"
                    >
                      <XCircle size={16} />
                      {processing === idea._id + "reject" ? "Rejecting..." : "Reject"}
                    </button>
                    <button
                      onClick={() => handleReview(idea._id, "approve")}
                      disabled={processing === idea._id + "approve"}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"
                    >
                      <CheckCircle size={16} />
                      {processing === idea._id + "approve" ? "Approving..." : "Approve"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </Layout>
  );
}
