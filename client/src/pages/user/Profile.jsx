import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axiosInstance";
import Layout from "../../components/common/Layout";
import "../../styles/Profile.css";

const TABS = ["Overview", "Security & Settings"];

const AVATAR_COLORS = [
  "#3B82F6","#8B5CF6","#EC4899","#EF4444","#F59E0B",
  "#10B981","#06B6D4","#6366F1","#84CC16","#F97316",
];
const BANNER_COLORS = [
  "linear-gradient(135deg,#1e3a8a,#3b82f6)",
  "linear-gradient(135deg,#4c1d95,#8b5cf6)",
  "linear-gradient(135deg,#831843,#ec4899)",
  "linear-gradient(135deg,#065f46,#10b981)",
  "linear-gradient(135deg,#7c2d12,#f97316)",
  "linear-gradient(135deg,#1e293b,#475569)",
  "linear-gradient(135deg,#0c4a6e,#06b6d4)",
  "linear-gradient(135deg,#3f6212,#84cc16)",
];

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
  const [form, setForm] = useState({ name: "", phone: "" });
  const [phoneError, setPhoneError] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  // Avatar & banner customization (stored in localStorage)
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem("profile_avatarColor") || "#3B82F6");
  const [bannerColor, setBannerColor] = useState(() => localStorage.getItem("profile_bannerColor") || "linear-gradient(135deg,#1e3a8a,#3b82f6)");
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    api.get("/auth/profile").then(({ data }) => {
      setFullUser(data);
      setForm({ name: data.name || "", phone: data.phone || "" });
    }).catch(() => {});
  }, []);

  const displayUser = fullUser || user;
  const rc = roleColors[displayUser?.role] || { bg: "#F3F4F6", color: "#374151" };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setPhoneError("");

    // Phone validation: required, starts with 0, exactly 10 digits, numbers only
    const phone = form.phone.trim();
    if (!phone) { setPhoneError("Phone number is required."); return; }
    if (!/^\d+$/.test(phone)) { setPhoneError("Phone number must contain numbers only."); return; }
    if (!phone.startsWith("0")) { setPhoneError("Phone number must start with 0."); return; }
    if (phone.length !== 10) { setPhoneError("Phone number must be exactly 10 digits."); return; }

    setSaving(true);
    try {
      await api.put("/auth/profile", { ...form, phone });
      await refreshUser();
      const { data } = await api.get("/auth/profile");
      setFullUser(data);
      setSuccess("Profile updated successfully!");
      setActiveTab("Overview"); // ← switch back to Overview after save
    } catch (err) {
      setError(err.response?.data?.message || "Update failed.");
    } finally { setSaving(false); }
  };

  const handleAgreeTerms = async () => {
    setTermsLoading(true);
    try {
      await api.put("/auth/agree-terms");
      await refreshUser();
      const { data } = await api.get("/auth/profile");
      setFullUser(data);
      setSuccess("Terms & Conditions accepted.");
    } catch { setError("Failed."); }
    finally { setTermsLoading(false); }
  };

  return (
    <Layout>
      <header className="profile-topbar">
        <span className="profile-topbar-title">University Management System</span>
        <div style={{ marginLeft: "auto" }}>
          <div className="profile-topbar-avatar">{displayUser?.name?.[0]?.toUpperCase() || "U"}</div>
        </div>
      </header>

      <main className="profile-main">
        <div className="profile-banner" style={{ background: bannerColor }}>
          <div className="profile-banner-overlay" />
        </div>

        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar" style={{ background: avatarColor }}>{displayUser?.name?.[0]?.toUpperCase() || "U"}</div>
            <div className="profile-online-dot" />
          </div>
          <div className="profile-info">
            <div className="profile-name-row">
              <h1 className="profile-name">{displayUser?.name}</h1>
              <span className="profile-role-badge" style={{ background: rc.bg, color: rc.color }}>{displayUser?.role}</span>
            </div>
            <div className="profile-meta-row">
              {displayUser?.email && (
                <span className="profile-meta">📍 {displayUser.email}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <button onClick={() => setShowColorPicker(v => !v)} className="profile-edit-btn">
              ✏ Edit Profile
            </button>
          </div>
        </div>

        {/* Edit Profile Modal - Avatar & Banner */}
        {showColorPicker && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Edit Profile Appearance</h2>
                <button onClick={() => setShowColorPicker(false)}
                  style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#64748b" }}>
                  ×
                </button>
              </div>

              {/* Avatar preview */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                  {displayUser?.name?.[0]?.toUpperCase() || "U"}
                </div>
              </div>

              {/* Avatar color */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Avatar Color</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {AVATAR_COLORS.map(c => (
                    <div key={c} onClick={() => { setAvatarColor(c); localStorage.setItem("profile_avatarColor", c); }}
                      style={{ width: 34, height: 34, borderRadius: "50%", background: c, cursor: "pointer", border: avatarColor === c ? "3px solid #0f172a" : "3px solid transparent", boxShadow: avatarColor === c ? "0 0 0 2px #fff inset" : "none", transition: "all 0.15s" }}
                    />
                  ))}
                </div>
              </div>

              {/* Banner preview */}
              <div style={{ height: 48, borderRadius: 12, background: bannerColor, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />

              {/* Banner color */}
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>Banner Color</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {BANNER_COLORS.map(c => (
                    <div key={c} onClick={() => { setBannerColor(c); localStorage.setItem("profile_bannerColor", c); }}
                      style={{ width: 56, height: 32, borderRadius: 8, background: c, cursor: "pointer", border: bannerColor === c ? "3px solid #0f172a" : "3px solid transparent", transition: "all 0.15s" }}
                    />
                  ))}
                </div>
              </div>

              <button onClick={() => setShowColorPicker(false)}
                style={{ width: "100%", padding: "10px 0", background: "#3B82F6", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                Done
              </button>
            </div>
          </div>
        )}

        <div className="profile-tabs">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`profile-tab ${activeTab === t ? "profile-tab-active" : ""}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="profile-content">

          {/* ── OVERVIEW ── */}
          {activeTab === "Overview" && (
            <div className="profile-grid">
              <div className="profile-card">
                <h3 className="profile-card-title">About</h3>
                <p className="profile-about-text">
                  {displayUser?.name} is a member of the university.
                  {displayUser?.termsAgreed
                    ? " Has accepted the Terms & Conditions and is eligible to submit ideas."
                    : " Has not yet accepted the Terms & Conditions."}
                </p>
              </div>

              {/* Personal info — no Update button, email shown as plain text */}
              <div className="profile-card profile-card-full">
                <div className="profile-card-title-row">
                  <h3 className="profile-card-title">Personal Information</h3>
                </div>
                <div className="profile-info-grid">
                  <InfoField label="EMAIL ADDRESS" value={displayUser?.email} />
                  <InfoField label="PHONE NUMBER" value={displayUser?.phone || "—"} />
                  <InfoField label="ROLE" value={displayUser?.role} />
                  <InfoField label="MEMBER SINCE" value={displayUser?.createdAt ? new Date(displayUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
                </div>
              </div>
            </div>
          )}

          {/* ── SECURITY & SETTINGS ── */}
          {activeTab === "Security & Settings" && (
            <div className="profile-settings-wrap">
              <div className="profile-card">
                <h3 className="profile-card-title">Edit Profile</h3>

                {success && <div className="profile-success-box">✓ {success}</div>}
                {error && <div className="profile-error-box">⚠ {error}</div>}

                <form onSubmit={handleSave}>
                  <div className="profile-form-grid">
                    <div>
                      <label className="profile-label">Full Name</label>
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        required className="profile-input" />
                    </div>
                    <div>
                      <label className="profile-label">Phone Number *</label>
                      <input
                        value={form.phone}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                          setForm({ ...form, phone: val });
                          setPhoneError("");
                        }}
                        placeholder="0xxxxxxxxx"
                        maxLength={10}
                        className="profile-input"
                        style={phoneError ? { borderColor: "#EF4444" } : {}}
                      />
                      {phoneError && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>⚠ {phoneError}</p>}
                      {!phoneError && form.phone && (
                        <p style={{ color: "#10B981", fontSize: 12, marginTop: 4 }}>
                          {form.phone.length}/10 {form.phone.length === 10 && form.phone.startsWith("0") ? "✓" : ""}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="profile-label">Email (read-only)</label>
                      <input value={displayUser?.email || ""} disabled className="profile-input" />
                    </div>
                    <div>
                      <label className="profile-label">Role (read-only)</label>
                      <input value={displayUser?.role || ""} disabled className="profile-input" />
                    </div>
                  </div>
                  <button type="submit" disabled={saving} className="profile-save-btn">
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              </div>

              {/* Terms — only show if not yet agreed, disappears after agreeing */}
              {!displayUser?.termsAgreed ? (
                <div className="profile-card profile-card-mt">
                  <h3 className="profile-card-title">Terms & Conditions</h3>
                  <p className="profile-p-sm">
                    You must accept the Terms & Conditions before submitting ideas. This only needs to be done once.
                  </p>
                  <button onClick={handleAgreeTerms} disabled={termsLoading} className="profile-terms-btn">
                    {termsLoading ? "Processing..." : "Accept Terms & Conditions"}
                  </button>
                </div>
              ) : (
                <div className="profile-card profile-card-mt" style={{ borderLeft: "4px solid #10B981" }}>
                  <h3 className="profile-card-title" style={{ color: "#065F46" }}>✓ Terms & Conditions Accepted</h3>
                  <p className="profile-p-sm">You have already accepted the Terms & Conditions. No further action needed.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </Layout>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <div className="profile-info-field-label">{label}</div>
      <div className="profile-info-field-value">{value}</div>
    </div>
  );
}