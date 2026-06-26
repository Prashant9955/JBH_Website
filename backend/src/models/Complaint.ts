import { Schema, model, Types } from "mongoose";

export type ComplaintCategory = "electrical" | "plumbing" | "furniture" | "cleaning" | "other";
export type ComplaintStatus = "pending" | "in_progress" | "resolved" | "rejected";

export interface ComplaintDoc {
  student: Types.ObjectId;
  subject: string;
  description?: string;
  category: ComplaintCategory;
  roomLocation?: string;
  status: ComplaintStatus;
  adminNotes?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<ComplaintDoc>(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    subject: { type: String, required: true },
    description: String,
    category: { type: String, enum: ["electrical", "plumbing", "furniture", "cleaning", "other"], default: "other" },
    roomLocation: String,
    status: { type: String, enum: ["pending", "in_progress", "resolved", "rejected"], default: "pending", index: true },
    adminNotes: String,
    resolvedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    resolvedAt: Date,
  },
  { timestamps: true }
);

export const Complaint = model<ComplaintDoc>("Complaint", ComplaintSchema);

