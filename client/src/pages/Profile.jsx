import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import Layout from "../components/Layout";

const TABS = ["Overview", "Activity History", "Security & Settings"];

const roleColors = {
  "Administrator": { bg: "#FEF3C7", color: "#D97706" },
  "Academic Staff": { bg: "#DBEAFE", color: "#1D4ED8" },
  "Support Staff": { bg: "#D1FAE5", color: "#065F46" },
  "QA Manager": { bg: "#EDE9FE", color: "#6D28D9" },
  "QA Coordinator": { bg: "#FCE7F3", color: "#9D174D" },
  "Student": { bg: "#F3F4F6", color: "#374151" },
};

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  const [fullUser, setFullUser] = useState(null);
  const [form, setForm] = useState({ name: "", department: "" });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  useEffect(() => {
    api.get("/auth/profile").then(({ data }) => {
      setFullUser(data);
      setForm({ name: data.name || "", department: data.department || "" });
    }).catch(() => {});
  }, []);

  const displayUser = fullUser || user;
  const rc = roleColors[displayUser?.role] || { bg: "#F3F4F6", color: "#374151" };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      await api.put("/auth/profile", form);
      await refreshUser();
      const { data } = await api.get("/auth/profile");
      setFullUser(data);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed.");
    } finally { setSaving(false); }
  };

  const handleAgreeTerms = async () => {
    setTermsLoading(true);
    try {
      await api.post("/auth/agree-terms");
      await refreshUser();
      const { data } = await api.get("/auth/profile");
      setFullUser(data);
      setSuccess("Terms & Conditions accepted.");
    } catch { setError("Failed."); }
    finally { setTermsLoading(false); }
  };

  return (
    <Layout>
      <header style={s.topbar}>
        <span style={s.topbarTitle}>University Management System</span>
        <nav style={s.topbarNav}>
          {["Dashboard", "Courses", "Faculty", "Students", "Reports"].map(n => (
            <span key={n} style={s.topbarLink}>{n}</span>
          ))}
        </nav>
        <div style={s.topbarAvatar}>{displayUser?.name?.[0]?.toUpperCase() || "U"}</div>
      </header>

      <main style={s.main}>
        {/* Banner */}
        <div style={s.banner}>
          <div style={s.bannerOverlay} />
        </div>

        {/* Profile header */}
        <div style={s.profileHeader}>
          <div style={s.avatarWrap}>
            <div style={s.avatar}>{displayUser?.name?.[0]?.toUpperCase() || "U"}</div>
            <div style={s.onlineDot} />
          </div>
          <div style={s.profileInfo}>
            <div style={s.nameRow}>
              <h1 style={s.name}>{displayUser?.name}</h1>
              <span style={{ ...s.roleBadge, background: rc.bg, color: rc.color }}>{displayUser?.role}</span>
            </div>
            <div style={s.metaRow}>
              {displayUser?.department && (
                <span style={s.meta}>🏢 {displayUser.department}</span>
              )}
              {displayUser?.email && (
                <span style={s.meta}>📍 {displayUser.email}</span>
              )}
            </div>
          </div>
          <button onClick={() => setActiveTab("Security & Settings")} style={s.editBtn}>
            ✏ Edit Profile
          </button>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ ...s.tab, ...(activeTab === t ? s.tabActive : {}) }}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={s.content}>
          {activeTab === "Overview" && (
            <div style={s.grid}>
              {/* About */}
              <div style={s.card}>
                <h3 style={s.cardTitle}>About</h3>
                <p style={s.aboutText}>
                  {displayUser?.name} is a member of the {displayUser?.department || "university"} department.
                  {displayUser?.termsAgreed
                    ? " Has accepted the Terms & Conditions and is eligible to submit ideas."
                    : " Has not yet accepted the Terms & Conditions."}
                </p>
              </div>

              {/* Personal info */}
              <div style={{ ...s.card, gridColumn: "1" }}>
                <div style={s.cardTitleRow}>
                  <h3 style={s.cardTitle}>Personal Information</h3>
                  <button onClick={() => setActiveTab("Security & Settings")} style={s.updateBtn}>Update</button>
                </div>
                <div style={s.infoGrid}>
                  <InfoField label="EMAIL ADDRESS" value={displayUser?.email} verified />
                  <InfoField label="DEPARTMENT" value={displayUser?.department || "—"} />
                  <InfoField label="ROLE" value={displayUser?.role} />
                  <InfoField label="MEMBER SINCE" value={displayUser?.createdAt ? new Date(displayUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
                  <InfoField label="TERMS AGREED" value={displayUser?.termsAgreed ? "Yes ✓" : "No ✗"} />
                </div>
              </div>

              {/* Terms banner */}
              {!displayUser?.termsAgreed && (
                <div style={s.termsBanner}>
                  <div>
                    <div style={s.termsTitle}>⚠ Terms & Conditions</div>
                    <div style={s.termsSub}>Accept to submit ideas on the platform.</div>
                  </div>
                  <button onClick={handleAgreeTerms} disabled={termsLoading} style={s.termsBtn}>
                    {termsLoading ? "Processing..." : "Accept Terms"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "Security & Settings" && (
            <div style={{ maxWidth: 560 }}>
              <div style={s.card}>
                <h3 style={s.cardTitle}>Edit Profile</h3>

                {success && <div style={s.successBox}>✓ {success}</div>}
                {error && <div style={s.errorBox}>⚠ {error}</div>}

                <form onSubmit={handleSave}>
                  <div style={s.formGrid}>
                    <div>
                      <label style={s.label}>Full Name</label>
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        required style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Department</label>
                      <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                        placeholder="e.g. Computer Science" style={s.input} />
                    </div>
                    <div>
                      <label style={s.label}>Email (read-only)</label>
                      <input value={displayUser?.email || ""} disabled style={{ ...s.input, background: "#F9FAFB", color: "#9CA3AF" }} />
                    </div>
                    <div>
                      <label style={s.label}>Role (read-only)</label>
                      <input value={displayUser?.role || ""} disabled style={{ ...s.input, background: "#F9FAFB", color: "#9CA3AF" }} />
                    </div>
                  </div>
                  <button type="submit" disabled={saving} style={s.saveBtn}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>

              {!displayUser?.termsAgreed && (
                <div style={{ ...s.card, marginTop: 16 }}>
                  <h3 style={s.cardTitle}>Terms & Conditions</h3>
                  <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 16 }}>
                    You must accept the Terms & Conditions before submitting ideas.
                  </p>
                  <button onClick={handleAgreeTerms} disabled={termsLoading} style={s.termsBtn}>
                    {termsLoading ? "Processing..." : "Accept Terms & Conditions"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "Activity History" && (
            <div style={s.card}>
              <h3 style={s.cardTitle}>Activity History</h3>
              <p style={{ fontSize: 14, color: "#9CA3AF", textAlign: "center", padding: "40px 0" }}>No activity recorded yet.</p>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}

function InfoField({ label, value, verified }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#111827", display: "flex", alignItems: "center", gap: 6 }}>
        {value}
        {verified && <span style={{ color: "#22C55E", fontSize: 14 }}>✓</span>}
      </div>
    </div>
  );
}

const s = {
  topbar: { height: 56, background: "#fff", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", padding: "0 24px", gap: 32, position: "sticky", top: 0, zIndex: 50 },
  topbarTitle: { fontSize: 15, fontWeight: 700, color: "#111827", display: "flex", alignItems: "center", gap: 8 },
  topbarNav: { display: "flex", gap: 24, marginLeft: "auto" },
  topbarLink: { fontSize: 13, color: "#6B7280", cursor: "pointer" },
  topbarAvatar: { width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#F97316,#EF4444)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  main: { flex: 1, overflowY: "auto", background: "#F9FAFB" },
  banner: { height: 160, background: "linear-gradient(135deg, #1E3A5F 0%, #2563EB 50%, #60A5FA 100%)", position: "relative", overflow: "hidden" },
  bannerOverlay: { position: "absolute", inset: 0, backgroundImage: "url('https://images.unsplash.com/photo-1562774053-701939374585?w=1200&q=80')", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.3 },
  profileHeader: { background: "#fff", padding: "0 32px 20px", display: "flex", alignItems: "flex-end", gap: 20, borderBottom: "1px solid #E5E7EB", position: "relative" },
  avatarWrap: { position: "relative", marginTop: -40 },
  avatar: { width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg, #3B82F6, #1D4ED8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, border: "4px solid #fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
  onlineDot: { position: "absolute", bottom: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: "#22C55E", border: "2px solid #fff" },
  profileInfo: { flex: 1, paddingBottom: 4 },
  nameRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 6 },
  name: { fontSize: 22, fontWeight: 700, color: "#111827" },
  roleBadge: { padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  metaRow: { display: "flex", gap: 20, flexWrap: "wrap" },
  meta: { fontSize: 13, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 },
  editBtn: { padding: "8px 18px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", alignSelf: "center", marginBottom: 4 },
  tabs: { display: "flex", background: "#fff", padding: "0 32px", gap: 0, borderBottom: "1px solid #E5E7EB" },
  tab: { padding: "12px 16px", border: "none", background: "none", fontSize: 14, color: "#6B7280", cursor: "pointer", borderBottom: "2px solid transparent", fontFamily: "Inter, sans-serif", fontWeight: 500 },
  tabActive: { color: "#2563EB", borderBottom: "2px solid #2563EB" },
  content: { padding: 24 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  card: { background: "#fff", borderRadius: 12, padding: 20, border: "1px solid #E5E7EB" },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 12 },
  cardTitleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  updateBtn: { fontSize: 13, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontWeight: 500 },
  aboutText: { fontSize: 14, color: "#6B7280", lineHeight: 1.7 },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" },
  termsBanner: { background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  termsTitle: { fontSize: 14, fontWeight: 600, color: "#92400E" },
  termsSub: { fontSize: 13, color: "#B45309", marginTop: 2 },
  termsBtn: { padding: "8px 18px", background: "#D97706", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
  successBox: { background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 8, padding: "10px 14px", color: "#166534", fontSize: 13, marginBottom: 16 },
  errorBox: { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#DC2626", fontSize: 13, marginBottom: 16 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #D1D5DB", borderRadius: 8, fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" },
  saveBtn: { padding: "9px 24px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
