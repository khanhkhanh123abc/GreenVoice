import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";
import { downloadCSV, downloadZIP, getAnalyticsFiles } from "../utils/downloadUtils";
import { socket } from "../App";
import "../styles/Analytics.css";

// ── Tooltip ──────────────────────────────────
function Tooltip({ visible, x, y, content }) {
  if (!visible) return null;
  return (
    <div className="analytics-tooltip" style={{ left:x+14, top:y }}>
      <div className="analytics-tooltip-inner">
        {content}
      </div>
    </div>
  );
}

// ── Interactive Bar Chart ─────────────────────
function BarChart({ data, maxVal, color = "linear-gradient(90deg,#3B82F6,#60A5FA)", label = "count" }) {
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: "" });
  const [hovered, setHovered] = useState(null);

  return (
    <div className="analytics-bar-chart">
      <Tooltip {...tooltip} />
      {data.map(([type, count], i) => (
        <div
          key={type}
          className="analytics-bar-row"
          onMouseEnter={e => { setHovered(i); setTooltip({ visible:true, x:e.clientX, y:e.clientY, content:`${type}: ${count} ideas` }); }}
          onMouseMove={e => setTooltip(t => ({ ...t, x:e.clientX, y:e.clientY }))}
          onMouseLeave={() => { setHovered(null); setTooltip(t => ({ ...t, visible:false })); }}
        >
          <div className={`analytics-bar-label${hovered===i?" hovered":""}`}>{type}</div>
          <div className="analytics-bar-track">
            <div className={`analytics-bar-fill${hovered===i?" hovered":""}`} style={{ width: `${(count/maxVal)*100}%` }} />
          </div>
          <div className={`analytics-bar-count${hovered===i?" hovered":""}`}>{count}</div>
        </div>
      ))}
    </div>
  );
}

// ── Interactive Table Row ─────────────────────
function IdeaRow({ idea, rank }) {
  const [hovered, setHovered] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: "" });
  const rankStyle = rank < 3 ? {
    background: rank===0?"#FEF9C3":rank===1?"#F3F4F6":"#FEF3C7",
    color:      rank===0?"#CA8A04":rank===1?"#6B7280":"#D97706",
  } : null;

  return (
    <tr
      className={`analytics-tr${hovered?" hovered":""}`}
      onMouseEnter={e => { setHovered(true); setTooltip({ visible:true, x:e.clientX, y:e.clientY, content:`Views: ${idea.views || 0} · Reactions: ${(idea.reactions||0)+(idea.likes?.length||0)}` }); }}
      onMouseMove={e => setTooltip(t => ({ ...t, x:e.clientX, y:e.clientY }))}
      onMouseLeave={() => { setHovered(false); setTooltip(t => ({ ...t, visible:false })); }}
    >
      <Tooltip {...tooltip} />
      <td className="analytics-td">
        {rankStyle
          ? <span className="analytics-rank-badge" style={rankStyle}>{rank+1}</span>
          : <span className="analytics-rank-num">{rank+1}</span>
        }
      </td>
      <td className="analytics-td analytics-td-title">
        <div className="analytics-idea-title">{idea.title}</div>
        <div className="analytics-idea-type">{idea.topicType}</div>
      </td>
      <td className={`analytics-td analytics-votes`}>{idea.votes}</td>
    </tr>
  );
}

// ── Stat Card with pulse on update ───────────
function StatCard({ icon, label, value, color, delta, updated }) {
  const [pulse, setPulse] = useState(false);
  const prevVal = useRef(value);

  useEffect(() => {
    if (prevVal.current !== value && prevVal.current !== 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 600);
      return () => clearTimeout(t);
    }
    prevVal.current = value;
  }, [value]);

  return (
    <div className="analytics-stat-card" style={{ boxShadow: pulse ? `0 0 0 3px ${color}40` : "none" }}>
      <div className="analytics-stat-top">
        <span className="analytics-stat-icon" style={{ color }}>{icon}</span>
        <span className="analytics-delta">{delta}</span>
      </div>
      <div className="analytics-stat-label">{label}</div>
      <div className="analytics-stat-value" style={{ color, transform: pulse ? "scale(1.05)" : "scale(1)" }}>
        {typeof value === "number" ? value.toLocaleString() : value || 0}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────
export default function Analytics() {
  const { user } = useAuth();
  const isManager = ["Administrator","QA Manager"].includes(user?.role);

  const [ideas, setIdeas]         = useState([]);
  const [stats, setStats]         = useState({ totalIdeas:0, totalUsers:0, totalVotes:0 });
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState("");
  const [adding, setAdding]       = useState(false);
  const [catError, setCatError]   = useState("");
  const [dlState, setDlState]     = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading]     = useState(true);
  const timerRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get("/ideas?limit=500");
      const list = data.ideas || [];
      setIdeas(list);
      setStats({
        totalIdeas: data.pagination?.total || list.length,
        totalUsers: 0,
        totalVotes: list.reduce((s,i) => s+(i.votes||0), 0),
      });
      setLastUpdated(new Date());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    // Socket real-time
    socket.on("analyticsUpdate", fetchData);
    // Polling fallback mỗi 30s
    timerRef.current = setInterval(fetchData, 1000);
    return () => {
      socket.off("analyticsUpdate", fetchData);
      clearInterval(timerRef.current);
    };
  }, [fetchData]);

  useEffect(() => {
    if (isManager) {
      api.get("/categories").then(({ data }) => setCategories(data.categories || [])).catch(() => {});
    }
  }, [isManager]);

  // ── Download handlers ──
  const handleDownloadCSV = () => {
    if (!ideas.length) return;
    setDlState("csv");
    downloadCSV(
      [...ideas].sort((a,b)=>b.votes-a.votes).map((idea,i) => ({
        rank: i+1, title: idea.title, type: idea.topicType,
        votes: idea.votes, views: idea.views,
        author: idea.isAnonymous?"Anonymous":idea.authorId?.name||"—",
      })),
      ["rank","title","type","votes","views","author"],
      "analytics_ideas.csv"
    );
    setTimeout(() => setDlState(null), 800);
  };

  const handleDownloadZIP = () => {
    if (!ideas.length) return;
    setDlState("zip");
    downloadZIP(getAnalyticsFiles(ideas, categories), "analytics_dashboard.zip");
    setTimeout(() => setDlState(null), 1000);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatError(""); setAdding(true);
    try {
      const { data } = await api.post("/categories", { name: newCatName.trim() });
      setCategories(prev => [...prev, data.category]);
      setNewCatName("");
    } catch (err) {
      setCatError(err.response?.data?.message || "Failed to add.");
    } finally { setAdding(false); }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      setCategories(prev => prev.filter(c => c._id !== id));
    } catch {}
  };

  const byType  = ideas.reduce((acc, i) => { acc[i.topicType]=(acc[i.topicType]||0)+1; return acc; }, {});
  const maxBar  = Math.max(...Object.values(byType), 1);
  const topIdeas = [...ideas].sort((a,b) => b.votes-a.votes).slice(0,5);

  const STATS_CFG = [
    { key:"totalIdeas", icon:"💡", label:"Total Ideas Submitted", color:"#2563EB", delta:"+real" },
    { key:"totalUsers", icon:"👥", label:"Active Staff Members",  color:"#10B981", delta:"live" },
    { key:"totalVotes", icon:"⭐", label:"Total Student Votes",   color:"#F59E0B", delta:"+real" },
  ];

  return (
    <Layout>
      <Topbar title="Analytics Dashboard" />
      <main className="analytics-main">

        {/* Header */}
        <div className="analytics-header">
          <div>
            <h1 className="analytics-page-title">Analytics Dashboard</h1>
            <p className="analytics-page-sub">Overview of university-wide idea submission and quality assurance metrics.</p>
          </div>
          <div className="analytics-header-right">
            {lastUpdated && (
              <div className="analytics-live-badge">
                <span className="analytics-live-dot" />
                Live · {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <div className="analytics-actions">
              <button onClick={handleDownloadCSV} disabled={!ideas.length||!!dlState}
                className={`analytics-btn-csv${dlState==="csv"?" downloading":""}`}>
                {dlState==="csv"?"⏳ Downloading...":"📥 Download CSV"}
              </button>
              <button onClick={handleDownloadZIP} disabled={!ideas.length||!!dlState}
                className={`analytics-btn-zip${dlState==="zip"?" zipping":""}`}>
                {dlState==="zip"?"⏳ Zipping...":"📦 Download ZIP"}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="analytics-stats-row">
          {STATS_CFG.map(({ key, icon, label, color, delta }) => (
            <StatCard key={key} icon={icon} label={label} value={stats[key]} color={color} delta={delta} updated={lastUpdated} />
          ))}
        </div>

        {loading ? (
          <div className="analytics-loading">
            <div className="analytics-spinner" />
            Loading...
          </div>
        ) : (
          <>
            <div className="analytics-row">
              {/* Bar chart */}
              <div className="analytics-card analytics-card-wide">
                <div className="analytics-card-title-row">
                  <div>
                    <h3 className="analytics-card-title">Ideas per Department</h3>
                    <p className="analytics-card-sub">Hover bars to see details</p>
                  </div>
                  <span className="analytics-card-badge">
                    {ideas.length} total
                  </span>
                </div>
                {Object.entries(byType).length === 0
                  ? <div className="analytics-no-data">No data yet</div>
                  : <BarChart data={Object.entries(byType)} maxVal={maxBar} />
                }
              </div>

              {/* Top ideas table */}
              <div className="analytics-card analytics-card-side">
                <div className="analytics-card-title-row">
                  <div>
                    <h3 className="analytics-card-title">Top Performing Ideas</h3>
                    <p className="analytics-card-sub">Hover rows to see views & reactions</p>
                  </div>
                </div>
                <table className="analytics-table">
                  <thead>
                    <tr>{["RANK","TITLE","VOTES"].map(h => <th key={h} className="analytics-th">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {topIdeas.map((idea,i) => <IdeaRow key={idea._id} idea={idea} rank={i} />)}
                    {!topIdeas.length && (
                      <tr><td colSpan={3} className="analytics-no-data">No data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Management */}
            {isManager && (
              <div className="analytics-card">
                <h3 className="analytics-card-title">Category Management</h3>
                <p className="analytics-card-sub">Manage the categories available for idea submission.</p>
                <div className="analytics-cat-row">
                  <div>
                    <div className="analytics-cat-label">Add New Category</div>
                    <form onSubmit={handleAddCategory} className="analytics-cat-form">
                      <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="e.g. Sustainability" className="analytics-cat-input" />
                      <button type="submit" disabled={adding} className="analytics-cat-add-btn">+</button>
                    </form>
                    {catError && <div className="analytics-cat-error">{catError}</div>}
                  </div>
                  <div className="analytics-cat-section">
                    <div className="analytics-cat-label">Active Categories ({categories.length})</div>
                    <div className="analytics-tag-list">
                      {categories.length===0 && <span className="analytics-cat-empty">No categories yet.</span>}
                      {categories.map(cat => (
                        <span key={cat._id} className="analytics-tag">
                          {cat.name}
                          <button onClick={() => handleDeleteCategory(cat._id)} className="analytics-tag-x" title="Remove">×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isManager && (
              <div className="analytics-card">
                <div className="analytics-restricted">
                  <div className="analytics-restricted-icon">🔒</div>
                  <div className="analytics-restricted-title">Restricted Access</div>
                  <div className="analytics-restricted-sub">Analytics and category management are available to QA Managers and Administrators.</div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
    </Layout>
  );
}

