import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axiosInstance";
import "../../styles/Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [emailPrefix, setEmailPrefix] = useState("");
  const [phone, setPhone] = useState("");
  const EMAIL_DOMAIN = "@univoice.vn";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNameChange = (e) => {
    const value = e.target.value;
    // Only allow letters, spaces, hyphens, and apostrophes (no numbers or special chars)
    if (/^[a-zA-Z\s'\-]*$/.test(value)) {
      setForm({ ...form, name: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate name
    if (!/^[a-zA-Z\s'\-]+$/.test(form.name.trim())) {
      setError("Full name must contain letters only. No numbers or special characters allowed.");
      return;
    }

    // Validate email prefix
    if (!emailPrefix.trim()) {
      setError("Please enter your email username.");
      return;
    }
    if (!/^[a-zA-Z0-9._\-]+$/.test(emailPrefix.trim())) {
      setError("Email username must not contain spaces or special characters.");
      return;
    }

    // Validate password length
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Validate phone
    if (!phone.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!/^\d+$/.test(phone)) {
      setError("Phone number must contain numbers only.");
      return;
    }
    if (!phone.startsWith("0")) {
      setError("Phone number must start with 0.");
      return;
    }
    if (phone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }

    const fullEmail = emailPrefix.trim() + EMAIL_DOMAIN;

    setLoading(true);
    try {
      await api.post("/auth/register", { ...form, email: fullEmail, phone });
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="register-page">
      <div className="register-left">
        <div className="register-left-inner">
          <div className="register-brand">
            <div className="register-brand-icon">🎓</div>
            <span className="register-brand-name">UniVoice</span>
          </div>
          <h2 className="register-tagline">Join the<br />conversation.</h2>
          <p className="register-tagline-sub">Create an account and start sharing ideas that improve campus life.</p>
        </div>
      </div>

      <div className="register-right">
        <div className="register-card">
          <h1 className="register-title">Create account</h1>
          <p className="register-subtitle">Fill in your details to get started</p>

          {error && <div className="register-error-box"><span>⚠</span> {error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="register-field">
              <label className="register-label">Full Name</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                required
                value={form.name}
                onChange={handleNameChange}
                className="register-input"
              />
              <p className="register-hint">Letters only — no numbers or special characters.</p>
            </div>

            {/* Email */}
            <div className="register-field">
              <label className="register-label">Email Address</label>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "0.5rem", overflow: "hidden", background: "#fff" }}>
                <input
                  type="text"
                  placeholder="your.name"
                  required
                  value={emailPrefix}
                  onChange={e => {
                    // Prevent @ and spaces
                    const val = e.target.value.replace(/@.*/, "").replace(/\s/g, "");
                    setEmailPrefix(val);
                  }}
                  className="register-input"
                  style={{ border: "none", borderRadius: 0, flex: 1, margin: 0 }}
                />
                <span style={{ padding: "0 12px", background: "#f1f5f9", color: "#475569", fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", borderLeft: "1px solid #cbd5e1", height: "100%", display: "flex", alignItems: "center" }}>
                  @univoice.vn
                </span>
              </div>
              <p className="register-hint">Your email will be: {emailPrefix ? <strong>{emailPrefix}@univoice.vn</strong> : <span style={{color:"#94a3b8"}}>username@univoice.vn</span>}</p>
            </div>

            {/* Password */}
            <div className="register-field">
              <label className="register-label">Password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                required
                minLength={6}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="register-input"
              />
              {form.password.length > 0 && form.password.length < 6 && (
                <p className="register-hint register-hint--error">
                  Password must be at least 6 characters ({form.password.length}/6)
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="register-field">
              <label className="register-label">Phone Number</label>
              <input
                type="text"
                placeholder="0xxxxxxxxx"
                required
                value={phone}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhone(val);
                }}
                maxLength={10}
                className="register-input"
              />
              {phone.length > 0 && phone.length < 10 && (
                <p className="register-hint register-hint--error">
                  {!phone.startsWith("0") ? "Must start with 0. " : ""}
                  {phone.length}/10 digits
                </p>
              )}
              {phone.length === 10 && phone.startsWith("0") && (
                <p className="register-hint" style={{ color: "#10B981" }}>✓ Valid phone number</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="register-btn" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="register-footer">
            Already have an account? <Link to="/login" className="register-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}