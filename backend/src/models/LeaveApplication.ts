import { Schema, model, Types } from "mongoose";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveApplicationDoc {
  student: Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  reason?: string;
  status: LeaveStatus;
  adminNotes?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
}

const LeaveApplicationSchema = new Schema<LeaveApplicationDoc>(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    adminNotes: String,
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    reviewedAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const LeaveApplication = model<LeaveApplicationDoc>("LeaveApplication", LeaveApplicationSchema);

