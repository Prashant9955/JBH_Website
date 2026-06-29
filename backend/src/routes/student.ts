import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { Student } from "../models/Student.js";
import { Notice } from "../models/Notice.js";
import { MessBill } from "../models/MessBill.js";
import { MessMenu } from "../models/MessMenu.js";
import { Complaint } from "../models/Complaint.js";
import { LeaveApplication } from "../models/LeaveApplication.js";
import { Payment } from "../models/Payment.js";

export const studentRouter = Router();

studentRouter.use(requireAuth, requireRole(["student"]));

studentRouter.get("/dashboard", async (req: AuthedRequest, res) => {
  const studentId = req.auth!.userId;

  const student = await Student.findById(studentId)
    .select("studentId fullName roomNumber block roomType")
    .lean()
    .exec();
  if (!student) return res.status(404).json({ success: false, message: "Student not found" });

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const monthYear = `${yyyy}-${mm}`;

  const [currentBill, dueBillsCount, pendingComplaints, latestNotices, latestBills, latestComplaints, menu] =
    await Promise.all([
      MessBill.findOne({ student: student._id, monthYear }).select("amount status").lean().exec(),
      MessBill.countDocuments({ student: student._id, status: "pending" }).exec(),
      Complaint.countDocuments({ student: student._id, status: { $in: ["pending", "in_progress"] } }).exec(),
      Notice.find({}).sort({ createdAt: -1 }).limit(6).lean().exec(),
      MessBill.find({ student: student._id }).sort({ monthYear: -1 }).limit(4).lean().exec(),
      Complaint.find({ student: student._id }).sort({ createdAt: -1 }).limit(5).lean().exec(),
      MessMenu.find({}).sort({ dayOfWeek: 1 }).lean().exec(),
    ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const noticeCount = await Notice.countDocuments({ createdAt: { $gt: sevenDaysAgo } }).exec();

  res.json({
    success: true,
    student,
    stats: {
      currentBill: currentBill ? { amount: currentBill.amount, status: currentBill.status } : { amount: 0, status: "pending" },
      dueBillsCount,
      pendingComplaints,
      noticeCount,
      monthYear,
    },
    latestNotices,
    latestBills,
    latestComplaints,
    menu,
  });
});

const LeaveSchema = z.object({
  from_date: z.string().min(1),
  to_date: z.string().min(1),
  reason: z.string().optional().or(z.literal("")),
});

studentRouter.post("/leave", async (req: AuthedRequest, res) => {
  const parsed = LeaveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Please provide from and to dates" });
  const { from_date, to_date, reason } = parsed.data;
  const from = new Date(from_date);
  const to = new Date(to_date);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return res.status(400).json({ success: false, message: "Invalid dates" });
  }
  if (from > to) return res.status(400).json({ success: false, message: "From date must be before to date" });

  const leave = await LeaveApplication.create({
    student: req.auth!.userId,
    fromDate: from,
    toDate: to,
    reason: reason || undefined,
  });

  res.json({ success: true, id: leave._id.toString() });
});

const ComplaintSchema = z.object({
  subject: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  category: z.enum(["electrical", "plumbing", "furniture", "cleaning", "other"]).default("other"),
  room_location: z.string().optional().or(z.literal("")),
});

studentRouter.post("/complaints", async (req: AuthedRequest, res) => {
  const parsed = ComplaintSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input" });
  const { subject, description, category, room_location } = parsed.data;
  const complaint = await Complaint.create({
    student: req.auth!.userId,
    subject,
    description: description || undefined,
    category,
    roomLocation: room_location || undefined,
  });
  res.json({ success: true, id: complaint._id.toString() });
});

const VerifyPaymentSchema = z.object({
  bill_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
});

// Demo-only verification (mirrors old PHP `api/verify-payment.php`)
studentRouter.post("/verify-payment", async (req: AuthedRequest, res) => {
  const parsed = VerifyPaymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false });
  const { bill_id, razorpay_payment_id, razorpay_order_id } = parsed.data;

  const bill = await MessBill.findOne({ _id: bill_id, student: req.auth!.userId }).exec();
  if (!bill) return res.status(404).json({ success: false });

  bill.status = "paid";
  bill.paidAt = new Date();
  bill.razorpayPaymentId = razorpay_payment_id;
  bill.razorpayOrderId = razorpay_order_id;
  await bill.save();

  await Payment.create({
    messBill: bill._id,
    student: bill.student,
    amount: bill.amount,
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    status: "captured",
    paymentMethod: "razorpay",
  });

  res.json({ success: true });
});

