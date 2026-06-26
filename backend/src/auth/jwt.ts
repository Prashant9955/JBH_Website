import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type AuthRole = "student" | "admin" | "warden";

export interface JwtPayload {
  sub: string;
  role: AuthRole;
}

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

