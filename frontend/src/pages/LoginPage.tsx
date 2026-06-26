import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./login.css";

type Role = "student" | "warden" | "admin";

export function LoginPage() {
  const nav = useNavigate();
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  const [role, setRole] = useState<Role>("student");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const idLabel = useMemo(() => {
    if (role === "warden") return "Warden ID";
    if (role === "admin") return "Admin Username";
    return "Student ID";
  }, [role]);

  const placeholder = useMemo(() => {
    if (role === "warden") return "e.g. warden";
    if (role === "admin") return "e.g. admin";
    return "e.g. DEI-2K23-CS-042";
  }, [role]);

  useEffect(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    let mx = 0;
    let my = 0;
    let rx = 0;
    let ry = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    const animate = () => {
      cursor.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = `translate(${rx - 16}px, ${ry - 16}px)`;
      raf = window.requestAnimationFrame(animate);
    };
    raf = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.cancelAnimationFrame(raf);
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, password, role }),
      });
      const data = (await res.json()) as { success: boolean; message?: string; redirect?: string };
      if (!data.success) {
        setError(data.message ?? "Login failed. Please try again.");
        return;
      }
      nav(data.redirect ?? "/dashboard/student");
    } catch {
      setError("Connection error. Ensure backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="cursor" ref={cursorRef} />
      <div className="cursor-ring" ref={ringRef} />

      <div className="login-body">
        <div className="left-panel">
          <div className="grid-lines" />
          <div className="left-top">
            <Link to="/" className="back-link">
              ← Back to Website
            </Link>
            <div className="left-brand">
              <div className="brand-badge">JBH</div>
              <div className="brand-name">
                Junior Boys
                <br />
                <em>Hostel</em>
              </div>
              <div className="brand-sub">DEI Agra · Student Portal</div>
            </div>
          </div>

          <div className="left-center">
            <div className="orbit-container">
              <div className="orbit-ring">
                <div className="orbit-dot" />
              </div>
              <div className="orbit-ring">
                <div className="orbit-dot" />
              </div>
              <div className="orbit-ring">
                <div className="orbit-dot" />
              </div>
              <div className="orbit-center">
                <span className="big-icon">🏠</span>
                <p>JBH Portal</p>
              </div>
            </div>
            <div className="left-tagline">
              <h3>
                Your Home,
                <br />
                Your Hub
              </h3>
              <p>Access your profile, mess bills, complaints, and notices — all in one place.</p>
            </div>
          </div>

          <div className="left-bottom">
            <p
              style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "0.62rem",
                letterSpacing: "2px",
                color: "rgba(255,255,255,0.2)",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Portal Access For
            </p>
            <div className="role-chips">
              <span className="role-chip chip-student">
                <i className="fas fa-graduation-cap" /> Students
              </span>
              <span className="role-chip chip-warden">
                <i className="fas fa-user-shield" /> Warden
              </span>
              <span className="role-chip chip-parent">
                <i className="fas fa-users" /> Parents
              </span>
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="login-box">
            <div className="login-header">
              <h2>
                SIGN <span>IN</span>
              </h2>
              <p>Access your hostel portal. Enter your credentials below to continue.</p>
            </div>

            <div className="notice-bar">
              <i className="fas fa-info-circle" />
              <p>Use your ID and password to log in. Demo users are seeded in MongoDB.</p>
            </div>

            <div className="role-tabs">
              <button type="button" className={`role-tab ${role === "student" ? "active" : ""}`} onClick={() => setRole("student")}>
                <i className="fas fa-graduation-cap" /> Student
              </button>
              <button type="button" className={`role-tab ${role === "warden" ? "active" : ""}`} onClick={() => setRole("warden")}>
                <i className="fas fa-user-shield" /> Warden
              </button>
              <button type="button" className={`role-tab ${role === "admin" ? "active" : ""}`} onClick={() => setRole("admin")}>
                <i className="fas fa-cog" /> Admin
              </button>
            </div>

            <form id="loginForm" onSubmit={onSubmit}>
              <div className="login-error" style={error ? { display: "block" } : undefined}>
                {error}
              </div>

              <div className="form-group">
                <label>{idLabel}</label>
                <div className="input-wrap">
                  <i className="fas fa-id-card" />
                  <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={placeholder} autoComplete="username" />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-wrap">
                  <i className="fas fa-lock" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPwd ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                  <button type="button" className="input-action" onClick={() => setShowPwd((v) => !v)} aria-label="Toggle password">
                    <i className={`fas ${showPwd ? "fa-eye-slash" : "fa-eye"}`} />
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  Remember me
                </label>
                <a href="#" className="forgot-link">
                  Forgot Password?
                </a>
              </div>

              <button type="submit" className="btn-login" disabled={loading}>
                <span>
                  <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-sign-in-alt"}`} /> {loading ? "Signing in…" : "Sign In to Portal"}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}


export default LoginPage;