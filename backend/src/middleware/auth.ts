import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { verifyToken } from "../auth/jwt.js";

export type AuthedRequest = Request & { auth?: { userId: string; role: "student" | "admin" | "warden" } };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[env.COOKIE_NAME];
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    const payload = verifyToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

export function requireRole(roles: Array<"student" | "admin" | "warden">) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!roles.includes(req.auth.role)) return res.status(403).json({ success: false, message: "Forbidden" });
    next();
  };
}

