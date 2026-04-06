import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); 

    if (!form.email.endsWith("@univoice.vn")) {
      setError("Only @univoice.vn email addresses are allowed.");
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/ideas");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-inner">
          <div className="login-brand">
            <div className="login-brand-icon">🎓</div>
            <span className="login-brand-name">UniVoice</span>
          </div>
          <h2 className="login-tagline">Share ideas.<br />Shape the future.</h2>
          <p className="login-tagline-sub">The university\'s idea management platform where every voice matters.</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h1 className="login-title">Welcome back</h1>
          <p className="login-subtitle">Sign in to your account</p>

          {error && (
            <div className="login-error-box">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-label">Email address</label>
              <input
                type="email" required placeholder="you@univoice.vn"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="login-input"
              />
            </div>
            <div className="login-field">
              <label className="login-label">Password</label>
              <input
                type="password" required placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="login-input"
              />
            </div>
            <button type="submit" disabled={loading} className="login-btn" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="login-footer">
            Don\'t have an account?{" "}
            <Link to="/register" className="login-link">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}