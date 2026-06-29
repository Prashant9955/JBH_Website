import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { Student } from "../models/Student.js";
import { Notice } from "../models/Notice.js";
import { MessBill } from "../models/MessBill.js";
import { MessMenu } from "../models/MessMenu.js";
import { Complaint } from "../models/Complaint.js";
import { LeaveApplication } from "../models/LeaveApplication.js";
import { SeatAvailability } from "../models/SeatAvailability.js";
import { ContactSubmission } from "../models/ContactSubmission.js";
import { hashPassword } from "../utils/password.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["admin", "warden"]));

// Only the "admin" role may create/delete student accounts or permanently
// remove records. Wardens have full read access and can manage day-to-day
// operational items (complaints, leaves, notices, mess, seats).
function requireAdminOnly(req: AuthedRequest, res: import("express").Response) {
  if (req.auth?.role !== "admin") {
    res.status(403).json({ success: false, message: "Only Admin can perform this action" });
    return false;
  }
  return true;
}

/* ----------------------------- Dashboard ------------------------------ */

adminRouter.get("/dashboard", async (req: AuthedRequest, res) => {
  const [
    totalStudents,
    activeStudents,
    pendingComplaints,
    pendingLeaves,
    unreadContacts,
    totalNotices,
    seats,
    pendingBills,
    recentComplaints,
    recentLeaves,
    recentContacts,
    recentStudents,
  ] = await Promise.all([
    Student.countDocuments({}).exec(),
    Student.countDocuments({ isActive: true }).exec(),
    Complaint.countDocuments({ status: { $in: ["pending", "in_progress"] } }).exec(),
    LeaveApplication.countDocuments({ status: "pending" }).exec(),
    ContactSubmission.countDocuments({ isRead: false }).exec(),
    Notice.countDocuments({}).exec(),
    SeatAvailability.find({}).lean().exec(),
    MessBill.countDocuments({ status: { $in: ["pending", "overdue"] } }).exec(),
    Complaint.find({}).sort({ createdAt: -1 }).limit(5).populate("student", "fullName studentId roomNumber").lean().exec(),
    LeaveApplication.find({}).sort({ createdAt: -1 }).limit(5).populate("student", "fullName studentId roomNumber").lean().exec(),
    ContactSubmission.find({}).sort({ createdAt: -1 }).limit(5).lean().exec(),
    Student.find({}).sort({ createdAt: -1 }).limit(5).select("fullName studentId roomNumber block createdAt").lean().exec(),
  ]);

  const totalSeats = seats.reduce((sum: number, s: { totalSeats?: number }) => sum + (s.totalSeats || 0), 0);
  const availableSeats = seats.reduce((sum: number, s: { availableSeats?: number }) => sum + (s.availableSeats || 0), 0);

  res.json({
    success: true,
    role: req.auth!.role,
    stats: {
      totalStudents,
      activeStudents,
      pendingComplaints,
      pendingLeaves,
      unreadContacts,
      totalNotices,
      totalSeats,
      availableSeats,
      pendingBills,
    },
    recentComplaints,
    recentLeaves,
    recentContacts,
    recentStudents,
  });
});

/* ------------------------------ Students ------------------------------- */

adminRouter.get("/students", async (req, res) => {
  const search = (req.query.search as string | undefined)?.trim();
  const filter: Record<string, unknown> = {};
  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fullName: re }, { studentId: re }, { roomNumber: re }, { block: re }];
  }
  const students = await Student.find(filter)
    .select("-passwordHash")
    .sort({ createdAt: -1 })
    .lean()
    .exec();
  res.json({ success: true, students });
});

const StudentCreateSchema = z.object({
  studentId: z.string().min(1),
  password: z.string().min(4),
  fullName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  roomNumber: z.string().optional().or(z.literal("")),
  block: z.string().optional().or(z.literal("")),
  roomType: z.enum(["single", "double", "triple", "reserved"]).optional(),
  course: z.string().optional().or(z.literal("")),
  year: z.coerce.number().optional(),
  department: z.string().optional().or(z.literal("")),
  guardianName: z.string().optional().or(z.literal("")),
  guardianPhone: z.string().optional().or(z.literal("")),
});

adminRouter.post("/students", async (req: AuthedRequest, res) => {
  if (!requireAdminOnly(req, res)) return;
  const parsed = StudentCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Please check the form fields" });
  const { password, ...rest } = parsed.data;

  const existing = await Student.findOne({ studentId: rest.studentId }).lean().exec();
  if (existing) return res.status(409).json({ success: false, message: "A student with this ID already exists" });

  const student = await Student.create({ ...rest, passwordHash: hashPassword(password) });
  const { passwordHash: _omit, ...safe } = student.toObject();
  res.json({ success: true, student: safe });
});

const StudentUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  roomNumber: z.string().optional().or(z.literal("")),
  block: z.string().optional().or(z.literal("")),
  roomType: z.enum(["single", "double", "triple", "reserved"]).optional(),
  course: z.string().optional().or(z.literal("")),
  year: z.coerce.number().optional(),
  department: z.string().optional().or(z.literal("")),
  guardianName: z.string().optional().or(z.literal("")),
  guardianPhone: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
  newPassword: z.string().min(4).optional().or(z.literal("")),
});

adminRouter.patch("/students/:id", async (req, res) => {
  const parsed = StudentUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input" });
  const { newPassword, ...rest } = parsed.data;

  const update: Record<string, unknown> = { ...rest };
  if (newPassword) update.passwordHash = hashPassword(newPassword);

  const student = await Student.findByIdAndUpdate(req.params.id, update, { new: true }).select("-passwordHash").exec();
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  res.json({ success: true, student });
});

adminRouter.delete("/students/:id", async (req: AuthedRequest, res) => {
  if (!requireAdminOnly(req, res)) return;
  const student = await Student.findByIdAndDelete(req.params.id).exec();
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });
  res.json({ success: true });
});

/* ----------------------------- Complaints ------------------------------ */

adminRouter.get("/complaints", async (req, res) => {
  const status = req.query.status as string | undefined;
  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  const complaints = await Complaint.find(filter)
    .sort({ createdAt: -1 })
    .populate("student", "fullName studentId roomNumber block")
    .lean()
    .exec();
  res.json({ success: true, complaints });
});

const ComplaintUpdateSchema = z.object({
  status: z.enum(["pending", "in_progress", "resolved", "rejected"]),
  adminNotes: z.string().optional().or(z.literal("")),
});

adminRouter.patch("/complaints/:id", async (req: AuthedRequest, res) => {
  const parsed = ComplaintUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input" });
  const { status, adminNotes } = parsed.data;

  const update: Record<string, unknown> = { status, adminNotes: adminNotes || undefined };
  if (status === "resolved" || status === "rejected") {
    update.resolvedBy = req.auth!.userId;
    update.resolvedAt = new Date();
  }

  const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true })
    .populate("student", "fullName studentId roomNumber")
    .exec();
  if (!complaint) return res.status(404).json({ success: false, message: "Complaint not found" });
  res.json({ success: true, complaint });
});

/* --------------------------- Leave Applications ------------------------ */

adminRouter.get("/leaves", async (req, res) => {
  const status = req.query.status as string | undefined;
  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  const leaves = await LeaveApplication.find(filter)
    .sort({ createdAt: -1 })
    .populate("student", "fullName studentId roomNumber block")
    .lean()
    .exec();
  res.json({ success: true, leaves });
});

const LeaveUpdateSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  adminNotes: z.string().optional().or(z.literal("")),
});

adminRouter.patch("/leaves/:id", async (req: AuthedRequest, res) => {
  const parsed = LeaveUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input" });
  const { status, adminNotes } = parsed.data;

  const leave = await LeaveApplication.findByIdAndUpdate(
    req.params.id,
    {
      status,
      adminNotes: adminNotes || undefined,
      reviewedBy: req.auth!.userId,
      reviewedAt: new Date(),
    },
    { new: true }
  )
    .populate("student", "fullName studentId roomNumber")
    .exec();
  if (!leave) return res.status(404).json({ success: false, message: "Leave application not found" });
  res.json({ success: true, leave });
});

/* -------------------------------- Notices ------------------------------- */

adminRouter.get("/notices", async (_req, res) => {
  const notices = await Notice.find({}).sort({ isPinned: -1, createdAt: -1 }).lean().exec();
  res.json({ success: true, notices });
});

const NoticeSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional().or(z.literal("")),
  category: z.enum(["urgent", "general", "mess", "sports", "maintenance", "admin"]).default("general"),
  isPinned: z.boolean().optional(),
});

adminRouter.post("/notices", async (req: AuthedRequest, res) => {
  const parsed = NoticeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Please provide a title" });
  const notice = await Notice.create({ ...parsed.data, createdBy: req.auth!.userId });
  res.json({ success: true, notice });
});

adminRouter.patch("/notices/:id", async (req, res) => {
  const parsed = NoticeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input" });
  const notice = await Notice.findByIdAndUpdate(req.params.id, parsed.data, { new: true }).exec();
  if (!notice) return res.status(404).json({ success: false, message: "Notice not found" });
  res.json({ success: true, notice });
});

adminRouter.delete("/notices/:id", async (req, res) => {
  const notice = await Notice.findByIdAndDelete(req.params.id).exec();
  if (!notice) return res.status(404).json({ success: false, message: "Notice not found" });
  res.json({ success: true });
});

/* ------------------------------ Mess Bills ------------------------------ */

adminRouter.get("/mess-bills", async (req, res) => {
  const monthYear = req.query.monthYear as string | undefined;
  const status = req.query.status as string | undefined;
  const filter: Record<string, unknown> = {};
  if (monthYear) filter.monthYear = monthYear;
  if (status && status !== "all") filter.status = status;
  const bills = await MessBill.find(filter)
    .sort({ monthYear: -1, createdAt: -1 })
    .populate("student", "fullName studentId roomNumber block")
    .lean()
    .exec();
  res.json({ success: true, bills });
});

const GenerateBillsSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM format"),
  amount: z.coerce.number().positive(),
  dueDate: z.string().optional().or(z.literal("")),
});

adminRouter.post("/mess-bills/generate", async (req, res) => {
  const parsed = GenerateBillsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Please provide month, year and amount" });
  const { monthYear, amount, dueDate } = parsed.data;

  const activeStudents = await Student.find({ isActive: true }).select("_id").lean().exec();
  const existing = await MessBill.find({ monthYear }).select("student").lean().exec();
  const existingIds = new Set(existing.map((b) => b.student.toString()));

  const toCreate = activeStudents
    .filter((s: { _id: { toString(): string } }) => !existingIds.has(s._id.toString()))
    .map((s: { _id: unknown }) => ({
      student: s._id,
      monthYear,
      amount,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      status: "pending" as const,
    }));

  if (toCreate.length > 0) await MessBill.insertMany(toCreate);
  res.json({ success: true, created: toCreate.length, skipped: existingIds.size });
});

const BillUpdateSchema = z.object({
  status: z.enum(["pending", "paid", "overdue"]),
});

adminRouter.patch("/mess-bills/:id", async (req, res) => {
  const parsed = BillUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input" });
  const update: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "paid") update.paidAt = new Date();
  const bill = await MessBill.findByIdAndUpdate(req.params.id, update, { new: true }).exec();
  if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });
  res.json({ success: true, bill });
});

/* ------------------------------ Mess Menu -------------------------------- */

adminRouter.get("/mess-menu", async (_req, res) => {
  const menu = await MessMenu.find({}).sort({ dayOfWeek: 1 }).lean().exec();
  res.json({ success: true, menu });
});

const MenuDaySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  breakfast: z.string().optional().or(z.literal("")),
  lunch: z.string().optional().or(z.literal("")),
  dinner: z.string().optional().or(z.literal("")),
  snacks: z.string().optional().or(z.literal("")),
});

const MenuUpdateSchema = z.object({ days: z.array(MenuDaySchema).min(1) });

adminRouter.put("/mess-menu", async (req, res) => {
  const parsed = MenuUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid menu data" });

  await Promise.all(
    parsed.data.days.map((d) =>
      MessMenu.findOneAndUpdate(
        { dayOfWeek: d.dayOfWeek },
        { ...d, weekStart: new Date() },
        { upsert: true, new: true }
      ).exec()
    )
  );
  const menu = await MessMenu.find({}).sort({ dayOfWeek: 1 }).lean().exec();
  res.json({ success: true, menu });
});

/* -------------------------- Seat Availability ---------------------------- */

adminRouter.get("/seats", async (_req, res) => {
  const seats = await SeatAvailability.find({}).sort({ roomType: 1 }).lean().exec();
  res.json({ success: true, seats });
});

const SeatSchema = z.object({
  roomType: z.string().min(1),
  totalSeats: z.coerce.number().min(0),
  availableSeats: z.coerce.number().min(0),
});

adminRouter.post("/seats", async (req, res) => {
  const parsed = SeatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input" });
  const exists = await SeatAvailability.findOne({ roomType: parsed.data.roomType }).lean().exec();
  if (exists) return res.status(409).json({ success: false, message: "This room type already exists" });
  const seat = await SeatAvailability.create(parsed.data);
  res.json({ success: true, seat });
});

adminRouter.patch("/seats/:id", async (req, res) => {
  const parsed = SeatSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input" });
  const seat = await SeatAvailability.findByIdAndUpdate(req.params.id, parsed.data, { new: true }).exec();
  if (!seat) return res.status(404).json({ success: false, message: "Room type not found" });
  res.json({ success: true, seat });
});

adminRouter.delete("/seats/:id", async (req, res) => {
  const seat = await SeatAvailability.findByIdAndDelete(req.params.id).exec();
  if (!seat) return res.status(404).json({ success: false, message: "Room type not found" });
  res.json({ success: true });
});

/* ------------------------------- Contacts -------------------------------- */

adminRouter.get("/contacts", async (req, res) => {
  const isRead = req.query.isRead as string | undefined;
  const filter: Record<string, unknown> = {};
  if (isRead === "true" || isRead === "false") filter.isRead = isRead === "true";
  const contacts = await ContactSubmission.find(filter).sort({ createdAt: -1 }).lean().exec();
  res.json({ success: true, contacts });
});

adminRouter.patch("/contacts/:id", async (req, res) => {
  const isRead = Boolean(req.body?.isRead);
  const contact = await ContactSubmission.findByIdAndUpdate(req.params.id, { isRead }, { new: true }).exec();
  if (!contact) return res.status(404).json({ success: false, message: "Message not found" });
  res.json({ success: true, contact });
});
