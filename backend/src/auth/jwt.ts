import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthRole = "student" | "admin" | "warden";

export interface JwtPayload {
  sub: string;
  role: AuthRole;
}

export function signToken(payload: JwtPayload) {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

