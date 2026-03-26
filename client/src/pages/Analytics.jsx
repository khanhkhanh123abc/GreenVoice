import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import Layout from "../components/Layout";
import Topbar from "../components/Topbar";

const STATS = [
  { key: "totalIdeas", icon: "💡", label: "Total Ideas Submitted", color: "#2563EB", delta: "+12%" },
  { key: "totalUsers", icon: "👥", label: "Active Staff Members", color: "#10B981", delta: "+5 New" },
  { key: "totalVotes", icon: "⭐", label: "Total Student Votes", color: "#F59E0B", delta: "+8%" },
];

export default function Analytics() {
  const { user } = useAuth();
  const isManager = ["Administrator", "QA Manager"].includes(user?.role);

  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState("");
  const [adding, setAdding] = useState(false);
  const [catError, setCatError] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [stats, setStats] = useState({ totalIdeas: 0, totalUsers: 0, totalVotes: 0 });

  useEffect(() => {
    api.get("/ideas?limit=100").then(({ data }) => {
      setIdeas(data.ideas || []);
      const total = data.pagination?.total || 0;
      const votes = (data.ideas || []).reduce((s, i) => s + (i.votes || 0), 0);
      setStats(prev => ({ ...prev, totalIdeas: total, totalVotes: votes }));
    }).catch(() => {});

    if (isManager) {
      api.get("/categories").then(({ data }) => setCategories(data.categories || [])).catch(() => {});
    }
  }, [isManager]);

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
    } catch { }
  };

  // Ideas per department (fake from topicType)
  const byType = ideas.reduce((acc, idea) => {
    acc[idea.topicType] = (acc[idea.topicType] || 0) + 1;
    return acc;
  }, {});

  const maxBar = Math.max(...Object.values(byType), 1);

  return (
    <Layout>
      <Topbar title="Analytics Dashboard" />

      <main style={s.main}>
        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>Analytics Dashboard</h1>
          <p style={s.pageSub}>Overview of university-wide idea submission and quality assurance metrics.</p>
          <div style={s.pageActions}>
            <button style={s.downloadBtn}>📥 Download CSV</button>
            <button style={s.downloadBtn}>📦 Download ZIP</button>
          </div>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          {STATS.map(({ key, icon, label, color, delta }) => (
            <div key={key} style={s.statCard}>
              <div style={s.statTop}>
                <span style={{ ...s.statIcon, color }}>{icon}</span>
                <span style={s.delta}>{delta}</span>
              </div>
              <div style={s.statLabel}>{label}</div>
              <div style={{ ...s.statValue, color }}>{stats[key]?.toLocaleString() || 0}</div>
            </div>
          ))}
        </div>

        <div style={s.row}>
          {/* Ideas per Type (bar chart) */}
          <div style={{ ...s.card, flex: 1.2 }}>
            <div style={s.cardTitleRow}>
              <div>
                <h3 style={s.cardTitle}>Ideas per Department</h3>
                <p style={s.cardSub}>Distribution across topic types</p>
              </div>
              <button style={s.menuBtn}>⋯</button>
            </div>
            <div style={s.barChart}>
              {Object.entries(byType).length === 0 ? (
                <div style={{ textAlign: "center", color: "#9CA3AF", padding: "40px 0", fontSize: 14 }}>No data yet</div>
              ) : (
                Object.entries(byType).map(([type, count]) => (
                  <div key={type} style={s.barRow}>
                    <div style={s.barLabel}>{type}</div>
                    <div style={s.barTrack}>
                      <div style={{ ...s.barFill, width: `${(count / maxBar) * 100}%` }} />
                    </div>
                    <div style={s.barCount}>{count}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Top ideas */}
          <div style={{ ...s.card, flex: 1 }}>
            <div style={s.cardTitleRow}>
              <div>
                <h3 style={s.cardTitle}>Top Performing Ideas</h3>
                <p style={s.cardSub}>Based on votes & engagement</p>
              </div>
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  {["RANK", "TITLE", "VOTES"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...ideas].sort((a, b) => b.votes - a.votes).slice(0, 5).map((idea, i) => (
                  <tr key={idea._id} style={s.tr}>
                    <td style={s.td}>
                      {i < 3 ? (
                        <span style={{ ...s.rankBadge, background: i === 0 ? "#FEF9C3" : i === 1 ? "#F3F4F6" : "#FEF3C7", color: i === 0 ? "#CA8A04" : i === 1 ? "#6B7280" : "#D97706" }}>
                          {i + 1}
                        </span>
                      ) : <span style={{ color: "#9CA3AF", fontSize: 14, paddingLeft: 8 }}>{i + 1}</span>}
                    </td>
                    <td style={{ ...s.td, maxWidth: 200 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{idea.title}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF" }}>{idea.topicType}</div>
                    </td>
                    <td style={{ ...s.td, fontWeight: 600, color: "#111827", fontSize: 14 }}>{idea.votes}</td>
                  </tr>
                ))}
                {ideas.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: "center", color: "#9CA3AF", padding: "24px 0", fontSize: 13 }}>No data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Management */}
        {isManager && (
          <div style={s.card}>
            <h3 style={s.cardTitle}>Category Management</h3>
            <p style={s.cardSub}>Manage the categories available for idea submission.</p>

            <div style={s.catRow}>
              <div>
                <div style={s.catLabel}>Add New Category</div>
                <form onSubmit={handleAddCategory} style={s.catForm}>
                  <input
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="e.g. Sustainability"
                    style={s.catInput}
                  />
                  <button type="submit" disabled={adding} style={s.catAddBtn}>+</button>
                </form>
                {catError && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 6 }}>{catError}</div>}
              </div>

              <div style={{ flex: 1 }}>
                <div style={s.catLabel}>Active Categories</div>
                <div style={s.tagList}>
                  {categories.length === 0 && (
                    <span style={{ fontSize: 13, color: "#9CA3AF" }}>No categories yet.</span>
                  )}
                  {categories.map(cat => (
                    <span key={cat._id} style={s.tag}>
                      {cat.name}
                      <button onClick={() => handleDeleteCategory(cat._id)} style={s.tagX}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {!isManager && (
          <div style={s.card}>
            <div style={{ textAlign: "center", padding: "40px 0", color: "#9CA3AF" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#374151" }}>Restricted Access</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Analytics and category management are available to QA Managers and Administrators.</div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}

const s = {
  main: { flex: 1, padding: 24, overflowY: "auto" },
  pageHeader: { marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 4 },
  pageSub: { fontSize: 14, color: "#6B7280" },
  pageActions: { display: "flex", gap: 10, marginTop: 12 },
  downloadBtn: { padding: "8px 16px", background: "#fff", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 13, color: "#374151", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 },
  statCard: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E5E7EB" },
  statTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  statIcon: { fontSize: 20 },
  delta: { fontSize: 12, color: "#10B981", fontWeight: 600, background: "#F0FDF4", padding: "2px 8px", borderRadius: 20 },
  statLabel: { fontSize: 12, color: "#9CA3AF", marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 700 },
  row: { display: "flex", gap: 16, marginBottom: 20 },
  card: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E5E7EB", marginBottom: 16 },
  cardTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#111827", margin: 0 },
  cardSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  menuBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9CA3AF" },
  barChart: { display: "flex", flexDirection: "column", gap: 14, padding: "8px 0 20px" },
  barRow: { display: "flex", alignItems: "center", gap: 12 },
  barLabel: { fontSize: 12, color: "#6B7280", width: 80, flexShrink: 0 },
  barTrack: { flex: 1, height: 8, background: "#F3F4F6", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", background: "linear-gradient(90deg, #3B82F6, #60A5FA)", borderRadius: 4, transition: "width 0.5s" },
  barCount: { fontSize: 12, color: "#9CA3AF", width: 24, textAlign: "right" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.05em", textAlign: "left", padding: "0 8px 10px" },
  tr: { borderBottom: "1px solid #F3F4F6" },
  td: { padding: "10px 8px", verticalAlign: "middle" },
  rankBadge: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", fontSize: 12, fontWeight: 700 },
  catRow: { display: "flex", gap: 32, flexWrap: "wrap", marginTop: 12 },
  catLabel: { fontSize: 12, fontWeight: 600, color: "#6B7280", marginBottom: 8 },
  catForm: { display: "flex", gap: 8 },
  catInput: { padding: "8px 12px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 13, color: "#111827", outline: "none", width: 200 },
  catAddBtn: { width: 34, height: 34, background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  tagList: { display: "flex", flexWrap: "wrap", gap: 8 },
  tag: { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "#EFF6FF", color: "#1D4ED8", borderRadius: 20, fontSize: 13, fontWeight: 500 },
  tagX: { background: "none", border: "none", cursor: "pointer", color: "#93C5FD", fontSize: 16, lineHeight: 1, padding: 0 },
};
