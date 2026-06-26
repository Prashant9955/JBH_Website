import { Schema, model, Types } from "mongoose";

export type BillStatus = "pending" | "paid" | "overdue";

export interface MessBillDoc {
  student: Types.ObjectId;
  monthYear: string; // YYYY-MM
  amount: number;
  daysStayed?: number;
  dueDate?: Date;
  status: BillStatus;
  paidAt?: Date;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
}

const MessBillSchema = new Schema<MessBillDoc>(
  {
    student: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    monthYear: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    daysStayed: { type: Number, default: 30 },
    dueDate: Date,
    status: { type: String, enum: ["pending", "paid", "overdue"], default: "pending", index: true },
    paidAt: Date,
    razorpayOrderId: String,
    razorpayPaymentId: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MessBillSchema.index({ student: 1, monthYear: 1 }, { unique: true });

export const MessBill = model<MessBillDoc>("MessBill", MessBillSchema);

