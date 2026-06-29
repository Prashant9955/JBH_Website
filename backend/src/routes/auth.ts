import { Router } from "express";
import { z } from "zod";
import { Admin } from "../models/Admin.js";
import { Student } from "../models/Student.js";
import { signToken } from "../auth/jwt.js";
import { env } from "../config/env.js";
import { verifyPassword } from "../utils/password.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

const LoginSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["student", "admin", "warden"]).default("student"),
});

authRouter.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid input" });
  const { userId, password, role } = parsed.data;

  if (role === "student") {
    const student = await Student.findOne({ studentId: userId, isActive: true }).exec();
    console.log(student);
    console.log(password);
    console.log(student?.passwordHash);
    console.log(
        verifyPassword(password, student!.passwordHash)
    );
    if (!student || !verifyPassword(password, student.passwordHash)) {
      return res.status(401).json({ success: false, message: "Invalid credentials. Please try again." });
    }
    const token = signToken({ sub: student._id.toString(), role: "student" });
    res.cookie(env.COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
    });
    return res.json({ success: true, redirect: "/dashboard/student" });
  }

  // admin/warden login
  const admin = await Admin.findOne({ username: userId }).exec();
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    return res.status(401).json({ success: false, message: "Invalid credentials. Please try again." });
  }
  if (role === "warden" && admin.role !== "warden") {
    return res.status(401).json({ success: false, message: "Invalid credentials. Please try again." });
  }

  const token = signToken({ sub: admin._id.toString(), role: admin.role });
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  });
  return res.json({ success: true, redirect: "/dashboard/admin" });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(env.COOKIE_NAME, { path: "/" });
  res.json({ success: true });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  if (!req.auth) return res.status(401).json({ success: false });
  if (req.auth.role === "student") {
    const student = await Student.findById(req.auth.userId).select("_id studentId fullName roomNumber block roomType").exec();
    return res.json({ success: true, user: { role: "student", ...student?.toObject() } });
  }
  const admin = await Admin.findById(req.auth.userId).select("_id username fullName role").exec();
  return res.json({ success: true, user: { role: admin?.role, ...admin?.toObject() } });
});

