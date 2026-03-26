import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/ideas");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.left}>
        <div style={s.leftInner}>
          <div style={s.brand}>
            <div style={s.brandIcon}>🎓</div>
            <span style={s.brandName}>UniVoice</span>
          </div>
          <h2 style={s.tagline}>Share ideas.<br />Shape the future.</h2>
          <p style={s.taglineSub}>The university's idea management platform where every voice matters.</p>
        </div>
      </div>

      <div style={s.right}>
        <div style={s.card}>
          <h1 style={s.title}>Welcome back</h1>
          <p style={s.subtitle}>Sign in to your account</p>

          {error && (
            <div style={s.errorBox}>
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Email address</label>
              <input
                type="email" required placeholder="you@university.edu"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                style={s.input}
              />
            </div>
            <div style={s.field}>
              <label style={s.label}>Password</label>
              <input
                type="password" required placeholder="••••••••"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                style={s.input}
              />
            </div>

            <button type="submit" disabled={loading} style={{ ...s.btn, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p style={s.footer}>
            Don't have an account?{" "}
            <Link to="/register" style={s.link}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { display: "flex", minHeight: "100vh", fontFamily: "Inter, sans-serif" },
  left: {
    flex: 1, background: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 60%, #60A5FA 100%)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 48,
  },
  leftInner: { color: "#fff", maxWidth: 360 },
  brand: { display: "flex", alignItems: "center", gap: 12, marginBottom: 48 },
  brandIcon: { fontSize: 28, background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: "6px 10px" },
  brandName: { fontSize: 22, fontWeight: 700, color: "#fff" },
  tagline: { fontSize: 36, fontWeight: 700, lineHeight: 1.25, marginBottom: 16, color: "#fff" },
  taglineSub: { fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 },

  right: { width: 480, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, background: "#F9FAFB" },
  card: { background: "#fff", borderRadius: 16, padding: 40, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" },
  title: { fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B7280", marginBottom: 28 },

  errorBox: { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#DC2626", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 },

  field: { marginBottom: 18 },
  label: { display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 12px", border: "1px solid #D1D5DB",
    borderRadius: 8, fontSize: 14, color: "#111827", outline: "none",
    boxSizing: "border-box", background: "#fff", transition: "border-color .15s",
  },
  btn: {
    width: "100%", padding: "11px", background: "#2563EB",
    border: "none", borderRadius: 8, color: "#fff",
    fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4,
  },
  footer: { textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 24 },
  link: { color: "#2563EB", textDecoration: "none", fontWeight: 500 },
};
