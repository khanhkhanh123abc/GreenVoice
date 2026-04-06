import { useState, useEffect } from "react";
import Layout from "../../components/common/Layout";
import api from "../../api/axiosInstance";
import {
  CheckCircle, XCircle, Clock, Bot, Eye,
  ChevronDown, ChevronUp, Lightbulb, BookOpen,
  BarChart2, Zap, Target, Star, Shield
} from "lucide-react";

// ── Rubric Score Bar ──────────────────────────────────────────
function ScoreBar({ label, value, max, icon: Icon, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Icon size={11} /> {label}
        </span>
        <span className="text-xs font-bold text-slate-700">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={"h-full rounded-full transition-all " + color}
          style={{ width: pct + "%" }}
        />
      </div>
    </div>
  );
}

// ── AI Score Panel ────────────────────────────────────────────
function AIScorePanel({ mod }) {
  const s = mod?.scores;
  const finalScore = s?.finalScore ?? null;

  const scoreColor = (score) => {
    if (score >= 70) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  return (
    <div className="mt-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <Bot size={12} className="text-purple-500" /> AI Analysis
        </span>
        {finalScore !== null && (
          <span className={"text-xs font-bold px-2 py-0.5 rounded-lg border " + scoreColor(finalScore)}>
            Score: {finalScore}/100
          </span>
        )}
      </div>

      {/* AI reason */}
      {mod?.reason && (
        <p className="text-xs text-slate-500 mb-2 italic">"{mod.reason}"</p>
      )}

      {/* Rubric bars — chỉ hiện nếu có scores */}
      {s && s.constructiveness !== null && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Rubric Breakdown</p>
          <ScoreBar label="Constructiveness" value={s.constructiveness || 0} max={30} icon={Zap} color="bg-blue-400" />
          <ScoreBar label="Feasibility"      value={s.feasibility || 0}      max={25} icon={Target} color="bg-green-400" />
          <ScoreBar label="Relevance"        value={s.relevance || 0}        max={25} icon={Star} color="bg-purple-400" />
          <ScoreBar label="Professionalism"  value={s.professionalism || 0}  max={20} icon={Shield} color="bg-orange-400" />
          {s.whitelistBoost > 0 && (
            <p className="text-xs text-green-600 font-medium mt-1">
              +{s.whitelistBoost} keyword boost (total: {s.totalScore} + {s.whitelistBoost} = {s.finalScore})
            </p>
          )}
        </div>
      )}

      {/* Decision badge */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400">AI Decision:</span>
        <span className={"text-xs font-bold px-2 py-0.5 rounded-full " + (mod?.autoApproved ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")}>
          {mod?.autoApproved ? "✅ Auto-approved" : mod?.decision === "approve" ? "⏳ Approve (low confidence)" : "🔴 Flagged"}
        </span>
        <span className="text-xs text-slate-400 ml-auto">{Math.round((mod?.confidence || 0) * 100)}% confidence</span>
      </div>
    </div>
  );
}

export default function ContentReview() {
  const [tab, setTab] = useState("ideas");
  const [ideas, setIdeas] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [note, setNote] = useState({});
  const [processing, setProcessing] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ideasRes, matsRes] = await Promise.all([
        api.get("/ideas/pending"),
        api.get("/learning-materials/pending"),
      ]);
      setIdeas(ideasRes.data.ideas || []);
      setMaterials(matsRes.data.materials || []);
    } catch (err) {
      showToast("Failed to load pending content", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleReview = async (id, action, type) => {
    const key = id + action + type;
    setProcessing(key);
    try {
      const endpoint = type === "idea"
        ? "/ideas/" + id + "/review"
        : "/learning-materials/" + id + "/review";
      await api.patch(endpoint, { action, note: note[id] || "" });
      showToast(action === "approve" ? "✅ Approved!" : "❌ Rejected — idea hidden from public feed");
      if (type === "idea") setIdeas(prev => prev.filter(i => i._id !== id));
      else setMaterials(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      showToast(err.response?.data?.message || "Error processing request", "error");
    } finally { setProcessing(null); }
  };

  const pendingCount = { ideas: ideas.length, materials: materials.length };
  const currentList = tab === "ideas" ? ideas : materials;
  const currentType = tab === "ideas" ? "idea" : "material";

  const ReviewCard = ({ item, type }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 md:p-5">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={"text-xs font-semibold px-2 py-0.5 rounded-full " +
                ((item.topicType || item.materialType) === "Academic" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700")}>
                {item.topicType || item.materialType}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">⏳ Pending</span>
              <span className={"text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 " +
                (type === "idea" ? "bg-indigo-100 text-indigo-700" : "bg-purple-100 text-purple-700")}>
                {type === "idea" ? <Lightbulb size={10} /> : <BookOpen size={10} />}
                {type === "idea" ? "Idea" : "Material"}
              </span>
            </div>
            <h3 className="font-bold text-slate-800 text-base">{item.title}</h3>
            <p className="text-xs text-slate-400 mt-1">
              By {item.isAnonymous ? "Anonymous" : item.authorId?.name || "Unknown"} ·{" "}
              {item.authorId?.department || item.authorId?.role || ""} ·{" "}
              {new Date(item.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Final score badge */}
          {item.aiModeration?.scores?.finalScore != null && (
            <div className={"shrink-0 text-sm font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 " +
              (item.aiModeration.scores.finalScore >= 70 ? "bg-green-50 text-green-700 border-green-200" :
               item.aiModeration.scores.finalScore >= 50 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
               "bg-red-50 text-red-700 border-red-200")}>
              <BarChart2 size={14} />
              {item.aiModeration.scores.finalScore}/100
            </div>
          )}
        </div>

        {/* AI analysis panel */}
        {item.aiModeration?.checkedAt && (
          <AIScorePanel mod={item.aiModeration} />
        )}

        {/* Expand/collapse content */}
        <button
          onClick={() => setExpanded(expanded === item._id ? null : item._id)}
          className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          <Eye size={13} />
          {expanded === item._id ? "Hide content" : "Read full content"}
          {expanded === item._id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {expanded === item._id && (
          <div className="mt-2 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed border border-slate-100">
            {item.content}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-slate-100 p-4 bg-slate-50/50">
        <textarea
          placeholder="Add a note (optional)..."
          value={note[item._id] || ""}
          onChange={e => setNote(prev => ({ ...prev, [item._id]: e.target.value }))}
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white mb-3"
          rows={2}
        />
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            onClick={() => handleReview(item._id, "reject", type)}
            disabled={!!processing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 border border-red-200 text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition"
          >
            <XCircle size={16} />
            {processing === item._id + "reject" + type ? "Rejecting..." : "Reject"}
          </button>
          <button
            onClick={() => handleReview(item._id, "approve", type)}
            disabled={!!processing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition"
          >
            <CheckCircle size={16} />
            {processing === item._id + "approve" + type ? "Approving..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Clock size={24} className="text-orange-500" /> Content Review
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Review pending ideas and learning materials. AI rubric scores (0–100) help prioritise your review queue.
            </p>
          </div>

          {toast && (
            <div className={"fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium " +
              (toast.type === "error" ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200")}>
              {toast.msg}
            </div>
          )}

          <div className="flex gap-2 mb-6">
            {["ideas", "materials"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border " +
                  (tab === t
                    ? (t === "ideas" ? "bg-indigo-600 text-white border-indigo-600" : "bg-purple-600 text-white border-purple-600")
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>
                {t === "ideas" ? <Lightbulb size={15} /> : <BookOpen size={15} />}
                {t === "ideas" ? "Ideas" : "Learning Materials"}
                {pendingCount[t] > 0 && (
                  <span className={"text-xs px-1.5 py-0.5 rounded-full font-bold " +
                    (tab === t ? "bg-white text-indigo-600" : "bg-orange-100 text-orange-600")}>
                    {pendingCount[t]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-20 text-slate-400">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              Loading...
            </div>
          )}

          {!loading && currentList.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
              <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">No pending {tab}!</p>
              <p className="text-slate-400 text-sm mt-1">All caught up 🎉</p>
            </div>
          )}

          {!loading && (
            <div className="space-y-4">
              {currentList.map(item => (
                <ReviewCard key={item._id} item={item} type={currentType} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
