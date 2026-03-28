import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosInstance";
import Layout from "../components/Layout";
import "../styles/Profile.css";

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
      <header className="profile-topbar">
        <span className="profile-topbar-title">University Management System</span>
        <nav className="profile-topbar-nav">
          {["Dashboard", "Courses", "Faculty", "Students", "Reports"].map(n => (
            <span key={n} className="profile-topbar-link">{n}</span>
          ))}
        </nav>
        <div className="profile-topbar-avatar">{displayUser?.name?.[0]?.toUpperCase() || "U"}</div>
      </header>

      <main className="profile-main">
        {/* Banner */}
        <div className="profile-banner">
          <div className="profile-banner-overlay" />
        </div>

        {/* Profile header */}
        <div className="profile-header">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{displayUser?.name?.[0]?.toUpperCase() || "U"}</div>
            <div className="profile-online-dot" />
          </div>
          <div className="profile-info">
            <div className="profile-name-row">
              <h1 className="profile-name">{displayUser?.name}</h1>
              <span className="profile-role-badge" style={{ background: rc.bg, color: rc.color }}>{displayUser?.role}</span>
            </div>
            <div className="profile-meta-row">
              {displayUser?.department && (
                <span className="profile-meta">🏢 {displayUser.department}</span>
              )}
              {displayUser?.email && (
                <span className="profile-meta">📍 {displayUser.email}</span>
              )}
            </div>
          </div>
          <button onClick={() => setActiveTab("Security & Settings")} className="profile-edit-btn">
            ✏ Edit Profile
          </button>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`profile-tab ${activeTab === t ? "profile-tab-active" : ""}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="profile-content">
          {activeTab === "Overview" && (
            <div className="profile-grid">
              {/* About */}
              <div className="profile-card">
                <h3 className="profile-card-title">About</h3>
                <p className="profile-about-text">
                  {displayUser?.name} is a member of the {displayUser?.department || "university"} department.
                  {displayUser?.termsAgreed
                    ? " Has accepted the Terms & Conditions and is eligible to submit ideas."
                    : " Has not yet accepted the Terms & Conditions."}
                </p>
              </div>

              {/* Personal info */}
              <div className="profile-card profile-card-full">
                <div className="profile-card-title-row">
                  <h3 className="profile-card-title">Personal Information</h3>
                  <button onClick={() => setActiveTab("Security & Settings")} className="profile-update-btn">Update</button>
                </div>
                <div className="profile-info-grid">
                  <InfoField label="EMAIL ADDRESS" value={displayUser?.email} verified />
                  <InfoField label="DEPARTMENT" value={displayUser?.department || "—"} />
                  <InfoField label="ROLE" value={displayUser?.role} />
                  <InfoField label="MEMBER SINCE" value={displayUser?.createdAt ? new Date(displayUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
                  <InfoField label="TERMS AGREED" value={displayUser?.termsAgreed ? "Yes ✓" : "No ✗"} />
                </div>
              </div>

              {/* Terms banner */}
              {!displayUser?.termsAgreed && (
                <div className="profile-terms-banner">
                  <div>
                    <div className="profile-terms-title">⚠ Terms & Conditions</div>
                    <div className="profile-terms-sub">Accept to submit ideas on the platform.</div>
                  </div>
                  <button onClick={handleAgreeTerms} disabled={termsLoading} className="profile-terms-btn">
                    {termsLoading ? "Processing..." : "Accept Terms"}
                  </button>
                </div>
              )}
            </div>
          )}

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
                      <label className="profile-label">Department</label>
                      <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                        placeholder="e.g. Computer Science" className="profile-input" />
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

              {!displayUser?.termsAgreed && (
                <div className="profile-card profile-card-mt">
                  <h3 className="profile-card-title">Terms & Conditions</h3>
                  <p className="profile-p-sm">
                    You must accept the Terms & Conditions before submitting ideas.
                  </p>
                  <button onClick={handleAgreeTerms} disabled={termsLoading} className="profile-terms-btn">
                    {termsLoading ? "Processing..." : "Accept Terms & Conditions"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "Activity History" && (
            <div className="profile-card">
              <h3 className="profile-card-title">Activity History</h3>
              <p className="profile-empty-activity">No activity recorded yet.</p>
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
      <div className="profile-info-field-label">{label}</div>
      <div className="profile-info-field-value">
        {value}
        {verified && <span className="profile-verified-check">✓</span>}
      </div>
    </div>
  );
}

