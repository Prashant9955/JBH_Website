import { Schema, model } from "mongoose";

export type AdminRole = "admin" | "warden";

export interface AdminDoc {
  username: string;
  passwordHash: string;
  fullName: string;
  role: AdminRole;
  email?: string;
  phone?: string;
  createdAt: Date;
}

const AdminSchema = new Schema<AdminDoc>(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    role: { type: String, enum: ["admin", "warden"], default: "warden" },
    email: String,
    phone: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Admin = model<AdminDoc>("Admin", AdminSchema);

