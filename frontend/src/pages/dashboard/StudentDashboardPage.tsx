import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./student-dashboard.css";

type Notice = { title: string; content?: string; category: string; createdAt: string };
type MessMenuItem = { dayOfWeek: number; breakfast?: string; lunch?: string; dinner?: string };
type Bill = { monthYear: string; amount: number; status: "pending" | "paid" | "overdue"; dueDate?: string };
type Complaint = { subject: string; status: "pending" | "in_progress" | "resolved" | "rejected"; category: string; createdAt: string };

type DashboardResponse = {
  success: boolean;
  student: { fullName: string; studentId: string; roomNumber?: string; block?: string; roomType?: string };
  stats: {
    currentBill: { amount: number; status: "pending" | "paid" | "overdue" };
    dueBillsCount: number;
    pendingComplaints: number;
    noticeCount: number;
    monthYear: string;
  };
  latestNotices: Notice[];
  latestBills: Bill[];
  latestComplaints: Complaint[];
  menu: MessMenuItem[];
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p.slice(0, 1).toUpperCase()).join("") || "ST";
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function formatMonthYear(monthYear: string) {
  const [y, m] = monthYear.split("-");
  const month = Number(m);
  const date = new Date(Number(y), Number.isFinite(month) ? month - 1 : 0, 1);
  return Number.isFinite(month) ? `${date.toLocaleString("en-IN", { month: "long" })} ${y}` : monthYear;
}

function noticeDotClass(cat: string) {
  if (cat === "urgent") return "nd-urgent";
  if (cat === "sports" || cat === "maintenance") return "nd-info";
  return "nd-general";
}

function billStatusClass(status: Bill["status"]) {
  if (status === "paid") return "bs-paid";
  if (status === "overdue") return "bs-overdue";
  return "bs-due";
}

function complaintClasses(status: Complaint["status"]) {
  if (status === "resolved") return { ci: "ci-resolved", cs: "cs-resolved" };
  if (status === "in_progress") return { ci: "ci-inprog", cs: "cs-inprog" };
  return { ci: "ci-pending", cs: "cs-pending" };
}

export function StudentDashboardPage() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [leave, setLeave] = useState({ from_date: "", to_date: "", reason: "" });
  const toastTimer = useRef<number | null>(null);

  const initials = useMemo(() => (data ? initialsFromName(data.student.fullName) : "ST"), [data]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    let mx = 0, my = 0, rx = 0, ry = 0;
    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener("mousemove", onMove);
    let raf = 0;
    const animate = () => {
      cursor.style.transform = `translate(${mx - 4}px, ${my - 4}px)`;
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.transform = `translate(${rx - 15}px, ${ry - 15}px)`;
      raf = window.requestAnimationFrame(animate);
    };
    raf = window.requestAnimationFrame(animate);
    return () => { window.removeEventListener("mousemove", onMove); window.cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const res = await fetch("/api/student/dashboard", { credentials: "include" });
        const json = (await res.json()) as DashboardResponse & { message?: string };
        if (!json.success) throw new Error(json.message ?? "Unauthorized");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function submitLeave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/student/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(leave),
      });
      const json = (await res.json()) as { success: boolean; message?: string };
      if (!json.success) throw new Error(json.message ?? "Failed");
      showToast("Leave request submitted!");
      setLeave({ from_date: "", to_date: "", reason: "" });
    } catch (err) {
      showToast(`Error: ${err instanceof Error ? err.message : "Failed"}`);
    }
  }

  const todayDow = new Date().getDay();
  const currentDate = useMemo(
    () => new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
    []
  );

  return (
    <>
      <div className="cursor" ref={cursorRef} />
      <div className="cursor-ring" ref={ringRef} />

      <div className="dash-body">
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`} id="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-logo">JBH</div>
            <div className="sidebar-title">
              <h3>JBH Portal</h3>
              <p>DEI Agra · 2024–25</p>
            </div>
          </div>
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <h4>{data?.student.fullName ?? "Student"}</h4>
              <p>
                {data?.student.studentId ?? "—"} · Room {data?.student.roomNumber ?? "—"}
              </p>
              <div className="user-status">
                <span />
                <p>Online</p>
              </div>
            </div>
          </div>
          <nav className="sidebar-nav">
            <p className="nav-section-label">Main</p>
            <a href="#" className="nav-item active">
              <i className="fas fa-th-large" /> Dashboard
            </a>
            <p className="nav-section-label">Settings</p>
            <Link to="/" className="nav-item">
              <i className="fas fa-external-link-alt" /> Main Website
            </Link>
          </nav>
          <div className="sidebar-footer">
            <button
              className="btn-logout"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                window.location.href = "/login";
              }}
              type="button"
            >
              <i className="fas fa-sign-out-alt" /> Sign Out
            </button>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <button className="menu-toggle" id="menuToggle" type="button" aria-label="Open menu" onClick={() => setSidebarOpen((v) => !v)}>
              <i className="fas fa-bars" />
            </button>
            <div className="topbar-left">
              <h2>Dashboard</h2>
              <p>Welcome back, {data?.student.fullName?.split(" ")[0] ?? "Student"}. Here's your hostel overview.</p>
            </div>
            <div className="topbar-right">
              <div className="topbar-date" id="currentDate">
                {currentDate}
              </div>
              <a href="#" className="topbar-icon-btn">
                <i className="fas fa-bell" />
                {data?.stats.noticeCount ? <span className="notif-dot" /> : null}
              </a>
              <div
                className="topbar-icon-btn"
                style={{
                  background: "linear-gradient(135deg,var(--teal),var(--gold))",
                  color: "white",
                  borderColor: "transparent",
                  fontFamily: "'Bebas Neue',sans-serif",
                  fontSize: "0.95rem",
                }}
              >
                {initials}
              </div>
            </div>
          </div>

          <div className="content">
            {error ? <div style={{ color: "var(--rust)", fontFamily: "'IBM Plex Mono',monospace" }}>{error}</div> : null}

            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-card-top">
                  <div className="stat-icon" style={{ background: "#f0fdfa", color: "var(--teal)" }}>
                    <i className="fas fa-rupee-sign" />
                  </div>
                  <span className={`stat-change ${data?.stats.currentBill.status === "paid" ? "change-up" : "change-down"}`}>
                    {data?.stats.currentBill.status === "paid" ? (
                      <>
                        <i className="fas fa-check-circle" /> Paid
                      </>
                    ) : (
                      "Due"
                    )}
                  </span>
                </div>
                <div className="stat-val">{(data?.stats.currentBill.amount ?? 0).toLocaleString("en-IN")}</div>
                <div className="stat-label">Current Mess Bill ({data?.stats.monthYear ?? ""})</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-top">
                  <div className="stat-icon" style={{ background: "#fffbeb", color: "var(--gold)" }}>
                    <i className="fas fa-calendar-day" />
                  </div>
                  <span className="stat-change change-up">{new Date().getDate()} day</span>
                </div>
                <div className="stat-val">{String(new Date().getDate()).padStart(2, "0")}</div>
                <div className="stat-label">Day of Month</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-top">
                  <div className="stat-icon" style={{ background: "#fef2f2", color: "var(--rust)" }}>
                    <i className="fas fa-tools" />
                  </div>
                  <span className="stat-change change-down">{data?.stats.pendingComplaints ?? 0} open</span>
                </div>
                <div className="stat-val">{String(data?.stats.pendingComplaints ?? 0).padStart(2, "0")}</div>
                <div className="stat-label">Pending Complaints</div>
              </div>

              <div className="stat-card">
                <div className="stat-card-top">
                  <div className="stat-icon" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
                    <i className="fas fa-door-open" />
                  </div>
                  <span className="stat-change">Room {data?.student.roomNumber ?? "-"}</span>
                </div>
                <div className="stat-val" style={{ fontSize: "1.8rem" }}>
                  {data?.student.roomNumber ?? "-"}
                </div>
                <div className="stat-label">
                  Block {data?.student.block ?? "A"} · {(data?.student.roomType ?? "triple").toString()} Sharing
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              {/* Mess Menu */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>This Week's Mess Menu</h3>
                    <p>Vegetarian menu · Updated weekly</p>
                  </div>
                  <a href="#" className="card-link">
                    Full Menu <i className="fas fa-arrow-right" />
                  </a>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 1fr", gap: 0, padding: "10px 24px", background: "var(--cream)" }}>
                    <span className="meal-type">Day</span>
                    <span className="meal-type">Breakfast</span>
                    <span className="meal-type">Lunch</span>
                    <span className="meal-type">Dinner</span>
                  </div>
                  {(data?.menu ?? []).map((m) => (
                    <div key={m.dayOfWeek} className={`meal-row ${m.dayOfWeek === todayDow ? "today" : ""}`}>
                      <span style={{ fontSize: "0.82rem", fontWeight: m.dayOfWeek === todayDow ? 600 : 400 }}>
                        {dayNames[m.dayOfWeek] ?? "-"}
                        {m.dayOfWeek === todayDow ? <span className="today-tag">Today</span> : null}
                      </span>
                      <span className="meal-name">{m.breakfast ?? "-"}</span>
                      <span className="meal-name">{m.lunch ?? "-"}</span>
                      <span className="meal-name">{m.dinner ?? "-"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notices */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>Latest Notices</h3>
                    <p>From Warden's Office</p>
                  </div>
                  <a href="#" className="card-link">
                    All <i className="fas fa-arrow-right" />
                  </a>
                </div>
                <div className="card-body">
                  {(data?.latestNotices ?? []).slice(0, 5).map((n) => (
                    <div key={n.createdAt + n.title} className="notice-list-item">
                      <span className={`notice-dot ${noticeDotClass(n.category)}`} />
                      <div>
                        <h5>{n.title}</h5>
                        <p>{(n.content ?? "").slice(0, 50)}{(n.content ?? "").length > 50 ? "..." : ""}</p>
                      </div>
                      <time>{new Date(n.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</time>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mess Bills */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3>Mess Bills</h3>
                    <p>Last 4 months</p>
                  </div>
                  <a href="#" className="card-link">
                    Pay Online <i className="fas fa-credit-card" />
                  </a>
                </div>
                <div className="card-body">
                  {(data?.latestBills ?? []).map((b) => (
                    <div key={b.monthYear} className="bill-card">
                      <div>
                        <div className="bill-month">{formatMonthYear(b.monthYear)}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
                          Due: {b.dueDate ? new Date(b.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="bill-amount">₹{b.amount.toLocaleString("en-IN")}</div>
                        <span className={`bill-status ${billStatusClass(b.status)}`} style={{ marginTop: 4, display: "inline-block" }}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leave + Complaints */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3>Leave Request</h3>
                      <p>Apply for home leave</p>
                    </div>
                  </div>
                  <div className="card-body leave-form">
                    <form onSubmit={submitLeave}>
                      <div className="form-row">
                        <div>
                          <label>From Date</label>
                          <input type="date" value={leave.from_date} onChange={(e) => setLeave((s) => ({ ...s, from_date: e.target.value }))} required />
                        </div>
                        <div>
                          <label>To Date</label>
                          <input type="date" value={leave.to_date} onChange={(e) => setLeave((s) => ({ ...s, to_date: e.target.value }))} required />
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label>Reason</label>
                        <textarea value={leave.reason} onChange={(e) => setLeave((s) => ({ ...s, reason: e.target.value }))} placeholder="Briefly describe your reason for leave..." />
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button type="submit" className="btn-sm btn-sm-primary">
                          <i className="fas fa-paper-plane" /> Submit Request
                        </button>
                        <button type="button" className="btn-sm btn-sm-outline" onClick={() => setLeave({ from_date: "", to_date: "", reason: "" })}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <div>
                      <h3>My Complaints</h3>
                      <p>Maintenance requests</p>
                    </div>
                    <a href="#" className="card-link">
                      + New
                    </a>
                  </div>
                  <div className="card-body">
                    {(data?.latestComplaints ?? []).map((c) => {
                      const cls = complaintClasses(c.status);
                      return (
                        <div key={c.createdAt + c.subject} className="complaint-item">
                          <div className={`complaint-icon ${cls.ci}`}>
                            <i className="fas fa-tools" />
                          </div>
                          <div>
                            <h5>{c.subject}</h5>
                            <p>Submitted {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                          </div>
                          <span className={`complaint-status ${cls.cs}`}>{c.status.replace("_", " ")}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`toast${toast ? " show" : ""}`} id="toast">
          {toast ?? ""}
        </div>
      </div>
    </>
  );
}

