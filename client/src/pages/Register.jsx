import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axiosInstance";
import "../styles/Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.post("/auth/register", form);
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
            {[
              { key: "name",       label: "Full Name",              type: "text",     placeholder: "Dr. John Doe" },
              { key: "email",      label: "Email Address",          type: "email",    placeholder: "you@university.edu" },
              { key: "password",   label: "Password",               type: "password", placeholder: "Min 6 characters" },
              { key: "department", label: "Department (optional)",  type: "text",     placeholder: "e.g. Civil Engineering", required: false },
            ].map(({ key, label, type, placeholder, required = true }) => (
              <div key={key} className="register-field">
                <label className="register-label">{label}</label>
                <input
                  type={type} placeholder={placeholder} required={required}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="register-input"
                />
              </div>
            ))}

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
