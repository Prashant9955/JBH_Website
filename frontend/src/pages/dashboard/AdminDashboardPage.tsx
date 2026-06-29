import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./admin-dashboard.css";

/* ------------------------------- Types ---------------------------------- */

type Role = "admin" | "warden";
type Me = { role: Role; fullName?: string; username?: string };

type Student = {
  _id: string;
  studentId: string;
  fullName: string;
  email?: string;
  phone?: string;
  roomNumber?: string;
  block?: string;
  roomType?: string;
  course?: string;
  year?: number;
  department?: string;
  guardianName?: string;
  guardianPhone?: string;
  isActive: boolean;
  createdAt: string;
};

type ComplaintStatus = "pending" | "in_progress" | "resolved" | "rejected";
type Complaint = {
  _id: string;
  student?: { _id: string; fullName: string; studentId: string; roomNumber?: string; block?: string };
  subject: string;
  description?: string;
  category: string;
  roomLocation?: string;
  status: ComplaintStatus;
  adminNotes?: string;
  createdAt: string;
};

type LeaveStatus = "pending" | "approved" | "rejected";
type Leave = {
  _id: string;
  student?: { _id: string; fullName: string; studentId: string; roomNumber?: string };
  fromDate: string;
  toDate: string;
  reason?: string;
  status: LeaveStatus;
  adminNotes?: string;
  createdAt: string;
};

type Notice = {
  _id: string;
  title: string;
  content?: string;
  category: string;
  isPinned: boolean;
  createdAt: string;
};

type BillStatus = "pending" | "paid" | "overdue";
type Bill = {
  _id: string;
  student?: { _id: string; fullName: string; studentId: string; roomNumber?: string };
  monthYear: string;
  amount: number;
  dueDate?: string;
  status: BillStatus;
};

type MenuDay = { dayOfWeek: number; breakfast?: string; lunch?: string; dinner?: string; snacks?: string };

type Seat = { _id: string; roomType: string; totalSeats: number; availableSeats: number };

type Contact = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  queryType?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type DashboardStats = {
  totalStudents: number;
  activeStudents: number;
  pendingComplaints: number;
  pendingLeaves: number;
  unreadContacts: number;
  totalNotices: number;
  totalSeats: number;
  availableSeats: number;
  pendingBills: number;
};

type Tab =
  | "overview"
  | "students"
  | "complaints"
  | "leaves"
  | "notices"
  | "mess-bills"
  | "mess-menu"
  | "seats"
  | "contacts";

/* ----------------------------- Helpers ----------------------------------- */

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json = (await res.json()) as T & { success: boolean; message?: string };
  if (!json.success) throw new Error(json.message ?? "Request failed");
  return json;
}

function fmtDate(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "U";
}

function badgeClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-pending";
    case "in_progress":
      return "bg-progress";
    case "resolved":
    case "approved":
    case "paid":
      return "bg-resolved";
    case "rejected":
    case "overdue":
    case "urgent":
      return "bg-rejected";
    default:
      return "bg-general";
  }
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* ------------------------------- Modal ------------------------------------ */

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ad-modal-header">
          <h3>{title}</h3>
          <button className="ad-modal-close" onClick={onClose} type="button">
            <i className="fas fa-times" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ============================== OVERVIEW ================================= */

function OverviewTab({ onToast }: { onToast: (m: string, err?: boolean) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<Leave[]>([]);
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dash, seatRes] = await Promise.all([
          api<{ stats: DashboardStats; recentComplaints: Complaint[]; recentLeaves: Leave[]; recentContacts: Contact[]; recentStudents: Student[] }>(
            "/api/admin/dashboard"
          ),
          api<{ seats: Seat[] }>("/api/admin/seats"),
        ]);
        if (cancelled) return;
        setStats(dash.stats);
        setRecentComplaints(dash.recentComplaints);
        setRecentLeaves(dash.recentLeaves);
        setRecentContacts(dash.recentContacts);
        setRecentStudents(dash.recentStudents);
        setSeats(seatRes.seats);
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Failed to load dashboard", true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="ad-loading">Loading dashboard…</div>;

  return (
    <>
      <div className="ad-stats-grid">
        <div className="ad-stat-card">
          <div className="ad-stat-icon" style={{ background: "#eef7f7", color: "var(--teal)" }}>
            <i className="fas fa-user-graduate" />
          </div>
          <div className="ad-stat-val">{stats?.activeStudents ?? 0}</div>
          <div className="ad-stat-label">Active Students · {stats?.totalStudents ?? 0} total</div>
        </div>
        <div className="ad-stat-card">
          <div className="ad-stat-icon" style={{ background: "#fbf3e6", color: "var(--gold)" }}>
            <i className="fas fa-tools" />
          </div>
          <div className="ad-stat-val">{stats?.pendingComplaints ?? 0}</div>
          <div className="ad-stat-label">Pending Complaints</div>
        </div>
        <div className="ad-stat-card">
          <div className="ad-stat-icon" style={{ background: "#fbeae5", color: "var(--rust)" }}>
            <i className="fas fa-door-open" />
          </div>
          <div className="ad-stat-val">{stats?.pendingLeaves ?? 0}</div>
          <div className="ad-stat-label">Pending Leave Requests</div>
        </div>
        <div className="ad-stat-card">
          <div className="ad-stat-icon" style={{ background: "#e8f6ee", color: "var(--green)" }}>
            <i className="fas fa-envelope" />
          </div>
          <div className="ad-stat-val">{stats?.unreadContacts ?? 0}</div>
          <div className="ad-stat-label">Unread Contact Messages</div>
        </div>
      </div>

      <div className="ad-card">
        <div className="ad-card-header">
          <div>
            <h3>Seat Availability</h3>
            <p>
              {stats?.availableSeats ?? 0} of {stats?.totalSeats ?? 0} seats free
            </p>
          </div>
        </div>
        <div className="ad-card-body" style={{ padding: 18 }}>
          {seats.length === 0 ? (
            <div className="ad-empty">No room types configured yet.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {seats.map((s) => {
                const pct = s.totalSeats > 0 ? Math.round((s.availableSeats / s.totalSeats) * 100) : 0;
                return (
                  <div key={s._id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 600 }}>
                      <span>{s.roomType}</span>
                      <span>
                        {s.availableSeats}/{s.totalSeats}
                      </span>
                    </div>
                    <div style={{ height: 6, background: "var(--cream)", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: pct === 0 ? "var(--rust)" : pct < 25 ? "var(--gold)" : "var(--green)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="ad-card">
          <div className="ad-card-header">
            <div>
              <h3>Recent Complaints</h3>
              <p>Latest maintenance requests</p>
            </div>
          </div>
          <div className="ad-card-body">
            {recentComplaints.length === 0 ? (
              <div className="ad-empty">No complaints yet.</div>
            ) : (
              recentComplaints.map((c) => (
                <div key={c._id} style={{ padding: "12px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{c.subject}</div>
                    <div className="ad-cell-muted">
                      {c.student?.fullName ?? "Unknown"} · Room {c.student?.roomNumber ?? "-"}
                    </div>
                  </div>
                  <span className={`ad-badge ${badgeClass(c.status)}`}>{c.status.replace("_", " ")}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ad-card">
          <div className="ad-card-header">
            <div>
              <h3>Recent Leave Requests</h3>
              <p>Latest applications</p>
            </div>
          </div>
          <div className="ad-card-body">
            {recentLeaves.length === 0 ? (
              <div className="ad-empty">No leave requests yet.</div>
            ) : (
              recentLeaves.map((l) => (
                <div key={l._id} style={{ padding: "12px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{l.student?.fullName ?? "Unknown"}</div>
                    <div className="ad-cell-muted">
                      {fmtDate(l.fromDate)} → {fmtDate(l.toDate)}
                    </div>
                  </div>
                  <span className={`ad-badge ${badgeClass(l.status)}`}>{l.status}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ad-card">
          <div className="ad-card-header">
            <div>
              <h3>Recent Contact Messages</h3>
              <p>From the public website</p>
            </div>
          </div>
          <div className="ad-card-body">
            {recentContacts.length === 0 ? (
              <div className="ad-empty">No messages yet.</div>
            ) : (
              recentContacts.map((c) => (
                <div key={c._id} style={{ padding: "12px 22px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{c.name}</span>
                    {!c.isRead && <span className="ad-badge bg-pending">New</span>}
                  </div>
                  <div className="ad-cell-muted">
                    {c.message.slice(0, 60)}
                    {c.message.length > 60 ? "…" : ""}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ad-card">
          <div className="ad-card-header">
            <div>
              <h3>Recently Added Students</h3>
              <p>Newest hostel residents</p>
            </div>
          </div>
          <div className="ad-card-body">
            {recentStudents.length === 0 ? (
              <div className="ad-empty">No students yet.</div>
            ) : (
              recentStudents.map((s) => (
                <div key={s._id} style={{ padding: "12px 22px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{s.fullName}</div>
                    <div className="ad-cell-muted">{s.studentId}</div>
                  </div>
                  <div className="ad-cell-muted">
                    Room {s.roomNumber ?? "-"} · Block {s.block ?? "-"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ============================== STUDENTS ================================= */

const emptyStudentForm = {
  studentId: "",
  password: "",
  fullName: "",
  email: "",
  phone: "",
  roomNumber: "",
  block: "",
  roomType: "triple",
  course: "",
  year: "",
  department: "",
  guardianName: "",
  guardianPhone: "",
};

function StudentsTab({ role, onToast }: { role: Role; onToast: (m: string, err?: boolean) => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState(emptyStudentForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(q?: string) {
    setLoading(true);
    try {
      const res = await api<{ students: Student[] }>(`/api/admin/students${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      setStudents(res.students);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to load students", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyStudentForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    setForm({
      studentId: s.studentId,
      password: "",
      fullName: s.fullName,
      email: s.email ?? "",
      phone: s.phone ?? "",
      roomNumber: s.roomNumber ?? "",
      block: s.block ?? "",
      roomType: s.roomType ?? "triple",
      course: s.course ?? "",
      year: s.year ? String(s.year) : "",
      department: s.department ?? "",
      guardianName: s.guardianName ?? "",
      guardianPhone: s.guardianPhone ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api(`/api/admin/students/${editing._id}`, {
          method: "PATCH",
          body: JSON.stringify({
            fullName: form.fullName,
            email: form.email,
            phone: form.phone,
            roomNumber: form.roomNumber,
            block: form.block,
            roomType: form.roomType,
            course: form.course,
            year: form.year ? Number(form.year) : undefined,
            department: form.department,
            guardianName: form.guardianName,
            guardianPhone: form.guardianPhone,
            newPassword: form.password || undefined,
          }),
        });
        onToast("Student updated");
      } else {
        await api("/api/admin/students", {
          method: "POST",
          body: JSON.stringify({ ...form, year: form.year ? Number(form.year) : undefined }),
        });
        onToast("Student added");
      }
      setModalOpen(false);
      load(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save student");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Student) {
    try {
      await api(`/api/admin/students/${s._id}`, { method: "PATCH", body: JSON.stringify({ isActive: !s.isActive }) });
      onToast(s.isActive ? "Student deactivated" : "Student activated");
      load(search);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  async function remove(s: Student) {
    if (!window.confirm(`Permanently delete ${s.fullName}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/students/${s._id}`, { method: "DELETE" });
      onToast("Student deleted");
      load(search);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div>
          <h3>Students</h3>
          <p>{students.length} shown</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input className="ad-search" placeholder="Search name, ID, room…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {role === "admin" && (
            <button className="ad-btn ad-btn-primary" onClick={openCreate} type="button">
              <i className="fas fa-plus" /> Add Student
            </button>
          )}
        </div>
      </div>
      <div className="ad-table-wrap">
        {loading ? (
          <div className="ad-loading">Loading students…</div>
        ) : students.length === 0 ? (
          <div className="ad-empty">No students found.</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Room</th>
                <th>Course</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s._id}>
                  <td>
                    <div className="ad-cell-strong">{s.fullName}</div>
                    <div className="ad-cell-muted">{s.studentId}</div>
                  </td>
                  <td>
                    {s.roomNumber ?? "-"} · Block {s.block ?? "-"}
                    <div className="ad-cell-muted">{s.roomType ?? "-"}</div>
                  </td>
                  <td>
                    {s.course ?? "-"}
                    <div className="ad-cell-muted">Year {s.year ?? "-"}</div>
                  </td>
                  <td className="ad-cell-muted">
                    {s.phone ?? "-"}
                    <div>{s.email ?? "-"}</div>
                  </td>
                  <td>
                    <span className={`ad-badge ${s.isActive ? "bg-resolved" : "bg-rejected"}`}>{s.isActive ? "active" : "inactive"}</span>
                  </td>
                  <td>
                    <div className="ad-row-actions">
                      <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => openEdit(s)} type="button">
                        <i className="fas fa-pen" /> Edit
                      </button>
                      <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => toggleActive(s)} type="button">
                        {s.isActive ? "Deactivate" : "Activate"}
                      </button>
                      {role === "admin" && (
                        <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => remove(s)} type="button">
                          <i className="fas fa-trash" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? "Edit Student" : "Add Student"} onClose={() => setModalOpen(false)}>
          <form onSubmit={submit}>
            {error && <div className="ad-form-error">{error}</div>}
            <div className="ad-form-grid">
              <div className="ad-field">
                <label>Student ID</label>
                <input value={form.studentId} disabled={!!editing} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} required />
              </div>
              <div className="ad-field">
                <label>{editing ? "Reset Password (optional)" : "Password"}</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? "Leave blank to keep current" : ""}
                  required={!editing}
                />
              </div>
              <div className="ad-field span-2">
                <label>Full Name</label>
                <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
              </div>
              <div className="ad-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="ad-field">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="ad-field">
                <label>Room Number</label>
                <input value={form.roomNumber} onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))} />
              </div>
              <div className="ad-field">
                <label>Block</label>
                <input value={form.block} onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))} />
              </div>
              <div className="ad-field">
                <label>Room Type</label>
                <select value={form.roomType} onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))}>
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                  <option value="triple">Triple</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              <div className="ad-field">
                <label>Year</label>
                <input type="number" min={1} max={6} value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
              </div>
              <div className="ad-field">
                <label>Course</label>
                <input value={form.course} onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))} />
              </div>
              <div className="ad-field">
                <label>Department</label>
                <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="ad-field">
                <label>Guardian Name</label>
                <input value={form.guardianName} onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))} />
              </div>
              <div className="ad-field">
                <label>Guardian Phone</label>
                <input value={form.guardianPhone} onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))} />
              </div>
            </div>
            <div className="ad-form-actions">
              <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Student"}
              </button>
              <button type="button" className="ad-btn ad-btn-outline" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================== COMPLAINTS ================================ */

function ComplaintsTab({ onToast }: { onToast: (m: string, err?: boolean) => void }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState<"all" | ComplaintStatus>("all");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Complaint | null>(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ComplaintStatus>("pending");
  const [saving, setSaving] = useState(false);

  async function load(f: typeof filter) {
    setLoading(true);
    try {
      const res = await api<{ complaints: Complaint[] }>(`/api/admin/complaints?status=${f}`);
      setComplaints(res.complaints);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to load complaints", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function openDetail(c: Complaint) {
    setActive(c);
    setStatus(c.status);
    setNotes(c.adminNotes ?? "");
  }

  async function quickStatus(c: Complaint, next: ComplaintStatus) {
    try {
      await api(`/api/admin/complaints/${c._id}`, { method: "PATCH", body: JSON.stringify({ status: next, adminNotes: c.adminNotes }) });
      onToast("Status updated");
      load(filter);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  async function saveDetail() {
    if (!active) return;
    setSaving(true);
    try {
      await api(`/api/admin/complaints/${active._id}`, { method: "PATCH", body: JSON.stringify({ status, adminNotes: notes }) });
      onToast("Complaint updated");
      setActive(null);
      load(filter);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to save", true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div>
          <h3>Complaints</h3>
          <p>{complaints.length} shown</p>
        </div>
        <div className="ad-filters">
          {(["all", "pending", "in_progress", "resolved", "rejected"] as const).map((f) => (
            <button key={f} className={`ad-filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)} type="button">
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="ad-table-wrap">
        {loading ? (
          <div className="ad-loading">Loading complaints…</div>
        ) : complaints.length === 0 ? (
          <div className="ad-empty">No complaints found.</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Location</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div className="ad-cell-strong">{c.student?.fullName ?? "Unknown"}</div>
                    <div className="ad-cell-muted">
                      {c.student?.studentId} · Room {c.student?.roomNumber ?? "-"}
                    </div>
                  </td>
                  <td>
                    <button onClick={() => openDetail(c)} style={{ background: "none", border: "none", color: "var(--ink)", fontWeight: 600, cursor: "pointer", padding: 0, textAlign: "left" }} type="button">
                      {c.subject}
                    </button>
                  </td>
                  <td className="ad-cell-muted">{c.category}</td>
                  <td className="ad-cell-muted">{c.roomLocation ?? "-"}</td>
                  <td className="ad-cell-muted">{fmtDate(c.createdAt)}</td>
                  <td>
                    <span className={`ad-badge ${badgeClass(c.status)}`}>{c.status.replace("_", " ")}</span>
                  </td>
                  <td>
                    <div className="ad-row-actions">
                      {c.status === "pending" && (
                        <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => quickStatus(c, "in_progress")} type="button">
                          Start
                        </button>
                      )}
                      {c.status !== "resolved" && (
                        <button className="ad-btn ad-btn-success ad-btn-sm" onClick={() => quickStatus(c, "resolved")} type="button">
                          Resolve
                        </button>
                      )}
                      <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => openDetail(c)} type="button">
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {active && (
        <Modal title="Complaint Details" onClose={() => setActive(null)}>
          <div className="ad-form-grid full">
            <div className="ad-field">
              <label>Student</label>
              <p style={{ fontSize: "0.88rem" }}>
                {active.student?.fullName} ({active.student?.studentId}) · Room {active.student?.roomNumber ?? "-"}
              </p>
            </div>
            <div className="ad-field">
              <label>Subject</label>
              <p style={{ fontSize: "0.88rem", fontWeight: 600 }}>{active.subject}</p>
            </div>
            <div className="ad-field">
              <label>Description</label>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{active.description || "No description provided."}</p>
            </div>
            <div className="ad-field">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ComplaintStatus)}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="ad-field">
              <label>Admin Notes</label>
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes about resolution…" />
            </div>
          </div>
          <div className="ad-form-actions">
            <button className="ad-btn ad-btn-primary" onClick={saveDetail} disabled={saving} type="button">
              {saving ? "Saving…" : "Save"}
            </button>
            <button className="ad-btn ad-btn-outline" onClick={() => setActive(null)} type="button">
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* =============================== LEAVES =================================== */

function LeavesTab({ onToast }: { onToast: (m: string, err?: boolean) => void }) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [filter, setFilter] = useState<"all" | LeaveStatus>("all");
  const [loading, setLoading] = useState(true);

  async function load(f: typeof filter) {
    setLoading(true);
    try {
      const res = await api<{ leaves: Leave[] }>(`/api/admin/leaves?status=${f}`);
      setLeaves(res.leaves);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to load leave requests", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function decide(l: Leave, status: LeaveStatus) {
    try {
      await api(`/api/admin/leaves/${l._id}`, { method: "PATCH", body: JSON.stringify({ status, adminNotes: l.adminNotes }) });
      onToast(`Leave ${status}`);
      load(filter);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div>
          <h3>Leave Applications</h3>
          <p>{leaves.length} shown</p>
        </div>
        <div className="ad-filters">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button key={f} className={`ad-filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)} type="button">
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="ad-table-wrap">
        {loading ? (
          <div className="ad-loading">Loading leave requests…</div>
        ) : leaves.length === 0 ? (
          <div className="ad-empty">No leave requests found.</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>From</th>
                <th>To</th>
                <th>Reason</th>
                <th>Applied</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l._id}>
                  <td>
                    <div className="ad-cell-strong">{l.student?.fullName ?? "Unknown"}</div>
                    <div className="ad-cell-muted">
                      {l.student?.studentId} · Room {l.student?.roomNumber ?? "-"}
                    </div>
                  </td>
                  <td>{fmtDate(l.fromDate)}</td>
                  <td>{fmtDate(l.toDate)}</td>
                  <td className="ad-cell-muted">{l.reason || "-"}</td>
                  <td className="ad-cell-muted">{fmtDate(l.createdAt)}</td>
                  <td>
                    <span className={`ad-badge ${badgeClass(l.status)}`}>{l.status}</span>
                  </td>
                  <td>
                    {l.status === "pending" ? (
                      <div className="ad-row-actions">
                        <button className="ad-btn ad-btn-success ad-btn-sm" onClick={() => decide(l, "approved")} type="button">
                          Approve
                        </button>
                        <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => decide(l, "rejected")} type="button">
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="ad-cell-muted">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* =============================== NOTICES =================================== */

const emptyNoticeForm = { title: "", content: "", category: "general", isPinned: false };

function NoticesTab({ onToast }: { onToast: (m: string, err?: boolean) => void }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState(emptyNoticeForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ notices: Notice[] }>("/api/admin/notices");
      setNotices(res.notices);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to load notices", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyNoticeForm);
    setModalOpen(true);
  }

  function openEdit(n: Notice) {
    setEditing(n);
    setForm({ title: n.title, content: n.content ?? "", category: n.category, isPinned: n.isPinned });
    setModalOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/admin/notices/${editing._id}`, { method: "PATCH", body: JSON.stringify(form) });
        onToast("Notice updated");
      } else {
        await api("/api/admin/notices", { method: "POST", body: JSON.stringify(form) });
        onToast("Notice posted");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to save notice", true);
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(n: Notice) {
    try {
      await api(`/api/admin/notices/${n._id}`, { method: "PATCH", body: JSON.stringify({ isPinned: !n.isPinned }) });
      load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  async function remove(n: Notice) {
    if (!window.confirm(`Delete notice "${n.title}"?`)) return;
    try {
      await api(`/api/admin/notices/${n._id}`, { method: "DELETE" });
      onToast("Notice deleted");
      load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div>
          <h3>Notices</h3>
          <p>{notices.length} posted</p>
        </div>
        <button className="ad-btn ad-btn-primary" onClick={openCreate} type="button">
          <i className="fas fa-plus" /> Add Notice
        </button>
      </div>
      <div className="ad-table-wrap">
        {loading ? (
          <div className="ad-loading">Loading notices…</div>
        ) : notices.length === 0 ? (
          <div className="ad-empty">No notices yet.</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Pinned</th>
                <th>Posted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notices.map((n) => (
                <tr key={n._id}>
                  <td>
                    <div className="ad-cell-strong">{n.title}</div>
                    <div className="ad-cell-muted">{(n.content ?? "").slice(0, 70)}</div>
                  </td>
                  <td>
                    <span className={`ad-badge ${badgeClass(n.category)}`}>{n.category}</span>
                  </td>
                  <td>{n.isPinned ? <i className="fas fa-thumbtack" style={{ color: "var(--gold)" }} /> : "-"}</td>
                  <td className="ad-cell-muted">{fmtDate(n.createdAt)}</td>
                  <td>
                    <div className="ad-row-actions">
                      <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => togglePin(n)} type="button">
                        {n.isPinned ? "Unpin" : "Pin"}
                      </button>
                      <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => openEdit(n)} type="button">
                        Edit
                      </button>
                      <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => remove(n)} type="button">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title={editing ? "Edit Notice" : "Add Notice"} onClose={() => setModalOpen(false)}>
          <form onSubmit={submit}>
            <div className="ad-form-grid full">
              <div className="ad-field">
                <label>Title</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="ad-field">
                <label>Content</label>
                <textarea rows={4} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="ad-field">
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  <option value="general">General</option>
                  <option value="urgent">Urgent</option>
                  <option value="mess">Mess</option>
                  <option value="sports">Sports</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="ad-field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  style={{ width: "auto" }}
                  checked={form.isPinned}
                  onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
                  id="pin-check"
                />
                <label htmlFor="pin-check" style={{ textTransform: "none", fontFamily: "inherit", fontSize: "0.82rem" }}>
                  Pin this notice to the top
                </label>
              </div>
            </div>
            <div className="ad-form-actions">
              <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Post Notice"}
              </button>
              <button type="button" className="ad-btn ad-btn-outline" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================== MESS BILLS ================================= */

function MessBillsTab({ onToast }: { onToast: (m: string, err?: boolean) => void }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | BillStatus>("all");
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState({ monthYear: "", amount: "", dueDate: "" });
  const [generating, setGenerating] = useState(false);

  async function load(f: typeof statusFilter) {
    setLoading(true);
    try {
      const res = await api<{ bills: Bill[] }>(`/api/admin/mess-bills?status=${f}`);
      setBills(res.bills);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to load bills", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!gen.monthYear || !gen.amount) {
      onToast("Please provide month and amount", true);
      return;
    }
    setGenerating(true);
    try {
      const res = await api<{ created: number; skipped: number }>("/api/admin/mess-bills/generate", {
        method: "POST",
        body: JSON.stringify(gen),
      });
      onToast(`Generated ${res.created} bill(s) · ${res.skipped} already existed`);
      load(statusFilter);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to generate bills", true);
    } finally {
      setGenerating(false);
    }
  }

  async function markStatus(b: Bill, status: BillStatus) {
    try {
      await api(`/api/admin/mess-bills/${b._id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      onToast("Bill updated");
      load(statusFilter);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  return (
    <>
      <div className="ad-card">
        <div className="ad-card-header">
          <div>
            <h3>Generate Mess Bills</h3>
            <p>Creates a bill for every active student who doesn't already have one for that month</p>
          </div>
        </div>
        <form onSubmit={generate} className="ad-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr auto", alignItems: "end" }}>
          <div className="ad-field">
            <label>Month</label>
            <input type="month" value={gen.monthYear} onChange={(e) => setGen((g) => ({ ...g, monthYear: e.target.value }))} required />
          </div>
          <div className="ad-field">
            <label>Amount (₹)</label>
            <input type="number" min={1} value={gen.amount} onChange={(e) => setGen((g) => ({ ...g, amount: e.target.value }))} required />
          </div>
          <div className="ad-field">
            <label>Due Date (optional)</label>
            <input type="date" value={gen.dueDate} onChange={(e) => setGen((g) => ({ ...g, dueDate: e.target.value }))} />
          </div>
          <button className="ad-btn ad-btn-primary" type="submit" disabled={generating}>
            {generating ? "Generating…" : "Generate"}
          </button>
        </form>
      </div>

      <div className="ad-card">
        <div className="ad-card-header">
          <div>
            <h3>All Bills</h3>
            <p>{bills.length} shown</p>
          </div>
          <div className="ad-filters">
            {(["all", "pending", "paid", "overdue"] as const).map((f) => (
              <button key={f} className={`ad-filter-btn ${statusFilter === f ? "active" : ""}`} onClick={() => setStatusFilter(f)} type="button">
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="ad-table-wrap">
          {loading ? (
            <div className="ad-loading">Loading bills…</div>
          ) : bills.length === 0 ? (
            <div className="ad-empty">No bills found. Generate some above.</div>
          ) : (
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <div className="ad-cell-strong">{b.student?.fullName ?? "Unknown"}</div>
                      <div className="ad-cell-muted">
                        {b.student?.studentId} · Room {b.student?.roomNumber ?? "-"}
                      </div>
                    </td>
                    <td>{b.monthYear}</td>
                    <td className="ad-cell-strong">₹{b.amount.toLocaleString("en-IN")}</td>
                    <td className="ad-cell-muted">{fmtDate(b.dueDate)}</td>
                    <td>
                      <span className={`ad-badge ${badgeClass(b.status)}`}>{b.status}</span>
                    </td>
                    <td>
                      <div className="ad-row-actions">
                        {b.status !== "paid" && (
                          <button className="ad-btn ad-btn-success ad-btn-sm" onClick={() => markStatus(b, "paid")} type="button">
                            Mark Paid
                          </button>
                        )}
                        {b.status !== "overdue" && b.status !== "paid" && (
                          <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => markStatus(b, "overdue")} type="button">
                            Mark Overdue
                          </button>
                        )}
                        {b.status !== "pending" && (
                          <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => markStatus(b, "pending")} type="button">
                            Reset
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

/* ============================== MESS MENU ================================= */

function MessMenuTab({ onToast }: { onToast: (m: string, err?: boolean) => void }) {
  const [days, setDays] = useState<MenuDay[]>(Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i })));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ menu: MenuDay[] }>("/api/admin/mess-menu");
        const byDay = new Map(res.menu.map((m) => [m.dayOfWeek, m]));
        setDays(Array.from({ length: 7 }, (_, i) => byDay.get(i) ?? { dayOfWeek: i }));
      } catch (e) {
        onToast(e instanceof Error ? e.message : "Failed to load menu", true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(i: number, field: keyof MenuDay, value: string) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, [field]: value } : d)));
  }

  async function save() {
    setSaving(true);
    try {
      await api("/api/admin/mess-menu", { method: "PUT", body: JSON.stringify({ days }) });
      onToast("Mess menu updated");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to save menu", true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="ad-card"><div className="ad-loading">Loading menu…</div></div>;

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div>
          <h3>Weekly Mess Menu</h3>
          <p>Edit meals for each day, then save</p>
        </div>
        <button className="ad-btn ad-btn-primary" onClick={save} disabled={saving} type="button">
          {saving ? "Saving…" : "Save Menu"}
        </button>
      </div>
      <div className="ad-table-wrap ad-menu-table">
        <table className="ad-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Breakfast</th>
              <th>Lunch</th>
              <th>Dinner</th>
              <th>Snacks</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => (
              <tr key={d.dayOfWeek}>
                <td className="ad-cell-strong">{dayNames[d.dayOfWeek]}</td>
                <td>
                  <input value={d.breakfast ?? ""} onChange={(e) => update(i, "breakfast", e.target.value)} />
                </td>
                <td>
                  <input value={d.lunch ?? ""} onChange={(e) => update(i, "lunch", e.target.value)} />
                </td>
                <td>
                  <input value={d.dinner ?? ""} onChange={(e) => update(i, "dinner", e.target.value)} />
                </td>
                <td>
                  <input value={d.snacks ?? ""} onChange={(e) => update(i, "snacks", e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================ SEATS ==================================== */

function SeatsTab({ onToast }: { onToast: (m: string, err?: boolean) => void }) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ roomType: "", totalSeats: "", availableSeats: "" });
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, { total: string; available: string }>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ seats: Seat[] }>("/api/admin/seats");
      setSeats(res.seats);
      const ev: Record<string, { total: string; available: string }> = {};
      res.seats.forEach((s) => {
        ev[s._id] = { total: String(s.totalSeats), available: String(s.availableSeats) };
      });
      setEditValues(ev);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to load seats", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addRoomType(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/api/admin/seats", {
        method: "POST",
        body: JSON.stringify({ roomType: form.roomType, totalSeats: Number(form.totalSeats), availableSeats: Number(form.availableSeats) }),
      });
      onToast("Room type added");
      setModalOpen(false);
      setForm({ roomType: "", totalSeats: "", availableSeats: "" });
      load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to add", true);
    } finally {
      setSaving(false);
    }
  }

  async function saveRow(s: Seat) {
    const v = editValues[s._id];
    if (!v) return;
    try {
      await api(`/api/admin/seats/${s._id}`, {
        method: "PATCH",
        body: JSON.stringify({ totalSeats: Number(v.total), availableSeats: Number(v.available) }),
      });
      onToast("Updated");
      load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  async function remove(s: Seat) {
    if (!window.confirm(`Remove "${s.roomType}"?`)) return;
    try {
      await api(`/api/admin/seats/${s._id}`, { method: "DELETE" });
      onToast("Removed");
      load();
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div>
          <h3>Seat Availability</h3>
          <p>Manage room type capacity</p>
        </div>
        <button className="ad-btn ad-btn-primary" onClick={() => setModalOpen(true)} type="button">
          <i className="fas fa-plus" /> Add Room Type
        </button>
      </div>
      <div className="ad-table-wrap">
        {loading ? (
          <div className="ad-loading">Loading…</div>
        ) : seats.length === 0 ? (
          <div className="ad-empty">No room types configured yet.</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Room Type</th>
                <th>Total Seats</th>
                <th>Available Seats</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {seats.map((s) => (
                <tr key={s._id}>
                  <td className="ad-cell-strong">{s.roomType}</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      style={{ width: 90, padding: "6px 8px", border: "1.5px solid var(--border)", borderRadius: 5 }}
                      value={editValues[s._id]?.total ?? ""}
                      onChange={(e) => setEditValues((p) => ({ ...p, [s._id]: { ...p[s._id], total: e.target.value, available: p[s._id]?.available ?? "0" } }))}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      style={{ width: 90, padding: "6px 8px", border: "1.5px solid var(--border)", borderRadius: 5 }}
                      value={editValues[s._id]?.available ?? ""}
                      onChange={(e) => setEditValues((p) => ({ ...p, [s._id]: { ...p[s._id], available: e.target.value, total: p[s._id]?.total ?? "0" } }))}
                    />
                  </td>
                  <td>
                    <div className="ad-row-actions">
                      <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => saveRow(s)} type="button">
                        Save
                      </button>
                      <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => remove(s)} type="button">
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title="Add Room Type" onClose={() => setModalOpen(false)}>
          <form onSubmit={addRoomType}>
            <div className="ad-form-grid full">
              <div className="ad-field">
                <label>Room Type Name</label>
                <input value={form.roomType} onChange={(e) => setForm((f) => ({ ...f, roomType: e.target.value }))} placeholder="e.g. Double Sharing" required />
              </div>
              <div className="ad-field">
                <label>Total Seats</label>
                <input type="number" min={0} value={form.totalSeats} onChange={(e) => setForm((f) => ({ ...f, totalSeats: e.target.value }))} required />
              </div>
              <div className="ad-field">
                <label>Available Seats</label>
                <input type="number" min={0} value={form.availableSeats} onChange={(e) => setForm((f) => ({ ...f, availableSeats: e.target.value }))} required />
              </div>
            </div>
            <div className="ad-form-actions">
              <button type="submit" className="ad-btn ad-btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Add"}
              </button>
              <button type="button" className="ad-btn ad-btn-outline" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* =============================== CONTACTS =================================== */

function ContactsTab({ onToast }: { onToast: (m: string, err?: boolean) => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Contact | null>(null);

  async function load(f: typeof filter) {
    setLoading(true);
    try {
      const q = f === "all" ? "" : `?isRead=${f === "read"}`;
      const res = await api<{ contacts: Contact[] }>(`/api/admin/contacts${q}`);
      setContacts(res.contacts);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed to load messages", true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function toggleRead(c: Contact) {
    try {
      await api(`/api/admin/contacts/${c._id}`, { method: "PATCH", body: JSON.stringify({ isRead: !c.isRead }) });
      load(filter);
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Failed", true);
    }
  }

  function openDetail(c: Contact) {
    setActive(c);
    if (!c.isRead) {
      api(`/api/admin/contacts/${c._id}`, { method: "PATCH", body: JSON.stringify({ isRead: true }) })
        .then(() => load(filter))
        .catch(() => undefined);
    }
  }

  return (
    <div className="ad-card">
      <div className="ad-card-header">
        <div>
          <h3>Contact Messages</h3>
          <p>{contacts.length} shown</p>
        </div>
        <div className="ad-filters">
          {(["all", "unread", "read"] as const).map((f) => (
            <button key={f} className={`ad-filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)} type="button">
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="ad-table-wrap">
        {loading ? (
          <div className="ad-loading">Loading messages…</div>
        ) : contacts.length === 0 ? (
          <div className="ad-empty">No messages found.</div>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Query Type</th>
                <th>Message</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c._id}>
                  <td>
                    <div className="ad-cell-strong">{c.name}</div>
                    <div className="ad-cell-muted">
                      {c.email}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </div>
                  </td>
                  <td className="ad-cell-muted">{c.queryType || "-"}</td>
                  <td>
                    <button onClick={() => openDetail(c)} style={{ background: "none", border: "none", color: "var(--ink)", cursor: "pointer", padding: 0, textAlign: "left" }} type="button">
                      {c.message.slice(0, 50)}
                      {c.message.length > 50 ? "…" : ""}
                    </button>
                  </td>
                  <td className="ad-cell-muted">{fmtDate(c.createdAt)}</td>
                  <td>
                    <span className={`ad-badge ${c.isRead ? "bg-general" : "bg-pending"}`}>{c.isRead ? "read" : "unread"}</span>
                  </td>
                  <td>
                    <button className="ad-btn ad-btn-outline ad-btn-sm" onClick={() => toggleRead(c)} type="button">
                      Mark {c.isRead ? "Unread" : "Read"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {active && (
        <Modal title="Message Details" onClose={() => setActive(null)}>
          <div className="ad-form-grid full">
            <div className="ad-field">
              <label>From</label>
              <p style={{ fontSize: "0.88rem" }}>
                {active.name} · {active.email}
                {active.phone ? ` · ${active.phone}` : ""}
              </p>
            </div>
            <div className="ad-field">
              <label>Query Type</label>
              <p style={{ fontSize: "0.85rem" }}>{active.queryType || "-"}</p>
            </div>
            <div className="ad-field">
              <label>Message</label>
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", whiteSpace: "pre-wrap" }}>{active.message}</p>
            </div>
          </div>
          <div className="ad-form-actions">
            <a className="ad-btn ad-btn-primary" href={`mailto:${active.email}`}>
              <i className="fas fa-reply" /> Reply by Email
            </a>
            <button className="ad-btn ad-btn-outline" onClick={() => setActive(null)} type="button">
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================== MAIN PAGE ================================== */

const navItems: { key: Tab; icon: string; label: string }[] = [
  { key: "overview", icon: "fa-th-large", label: "Overview" },
  { key: "students", icon: "fa-user-graduate", label: "Students" },
  { key: "complaints", icon: "fa-tools", label: "Complaints" },
  { key: "leaves", icon: "fa-door-open", label: "Leave Requests" },
  { key: "notices", icon: "fa-bullhorn", label: "Notices" },
  { key: "mess-bills", icon: "fa-receipt", label: "Mess Bills" },
  { key: "mess-menu", icon: "fa-utensils", label: "Mess Menu" },
  { key: "seats", icon: "fa-bed", label: "Seat Availability" },
  { key: "contacts", icon: "fa-envelope", label: "Contact Messages" },
];

export function AdminDashboardPage() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; error?: boolean } | null>(null);
  const [badges, setBadges] = useState<{ complaints: number; leaves: number; contacts: number }>({ complaints: 0, leaves: 0, contacts: 0 });
  const toastTimer = useRef<number | null>(null);

  function showToast(message: string, error?: boolean) {
    setToast({ message, error });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
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
    (async () => {
      try {
        const res = await api<{ user: Me }>("/api/auth/me");
        setMe(res.user);
      } catch {
        window.location.href = "/login";
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ stats: DashboardStats }>("/api/admin/dashboard");
        setBadges({ complaints: res.stats.pendingComplaints, leaves: res.stats.pendingLeaves, contacts: res.stats.unreadContacts });
      } catch {
        // silent - badge counts are non-critical
      }
    })();
  }, [tab]);

  const currentDate = useMemo(
    () => new Date().toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }),
    []
  );

  const title = navItems.find((n) => n.key === tab)?.label ?? "Overview";

  return (
    <>
      <div className="cursor" ref={cursorRef} />
      <div className="cursor-ring" ref={ringRef} />

      <div className="ad-body">
        <aside className={`ad-sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="ad-sidebar-header">
            <div className="ad-sidebar-logo">JBH</div>
            <div className="ad-sidebar-title">
              <h3>JBH Portal</h3>
              <p>DEI Agra · Admin</p>
            </div>
          </div>
          <div className="ad-sidebar-user">
            <div className="ad-user-avatar">{initials(me?.fullName)}</div>
            <div className="ad-user-info">
              <h4>{me?.fullName ?? "—"}</h4>
              <span className="ad-role-badge">{me?.role === "warden" ? "Warden" : "Administrator"}</span>
            </div>
          </div>
          <nav className="ad-nav">
            <p className="ad-nav-section-label">Management</p>
            {navItems.map((item) => {
              const badge = item.key === "complaints" ? badges.complaints : item.key === "leaves" ? badges.leaves : item.key === "contacts" ? badges.contacts : 0;
              return (
                <button key={item.key} className={`ad-nav-item ${tab === item.key ? "active" : ""}`} onClick={() => { setTab(item.key); setSidebarOpen(false); }} type="button">
                  <i className={`fas ${item.icon}`} /> {item.label}
                  {badge > 0 && <span className="ad-nav-badge">{badge}</span>}
                </button>
              );
            })}
            <p className="ad-nav-section-label">Settings</p>
            <Link to="/" className="ad-nav-item" style={{ textDecoration: "none" }}>
              <i className="fas fa-external-link-alt" /> Main Website
            </Link>
          </nav>
          <div className="ad-sidebar-footer">
            <button
              className="ad-btn-logout"
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

        <div className="ad-main">
          <div className="ad-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="ad-menu-toggle" onClick={() => setSidebarOpen((v) => !v)} type="button">
                <i className="fas fa-bars" />
              </button>
              <div className="ad-topbar-left">
                <h2>{title}</h2>
                <p>Hostel management · DEI Agra</p>
              </div>
            </div>
            <div className="ad-topbar-date">{currentDate}</div>
          </div>

          <div className="ad-content">
            {!me ? (
              <div className="ad-loading">Loading…</div>
            ) : tab === "overview" ? (
              <OverviewTab onToast={showToast} />
            ) : tab === "students" ? (
              <StudentsTab role={me.role} onToast={showToast} />
            ) : tab === "complaints" ? (
              <ComplaintsTab onToast={showToast} />
            ) : tab === "leaves" ? (
              <LeavesTab onToast={showToast} />
            ) : tab === "notices" ? (
              <NoticesTab onToast={showToast} />
            ) : tab === "mess-bills" ? (
              <MessBillsTab onToast={showToast} />
            ) : tab === "mess-menu" ? (
              <MessMenuTab onToast={showToast} />
            ) : tab === "seats" ? (
              <SeatsTab onToast={showToast} />
            ) : (
              <ContactsTab onToast={showToast} />
            )}
          </div>
        </div>

        <div className={`ad-toast${toast ? " show" : ""}${toast?.error ? " error" : ""}`}>{toast?.message ?? ""}</div>
      </div>
    </>
  );
}

export default AdminDashboardPage;
