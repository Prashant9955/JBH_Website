import { Schema, model, Types } from "mongoose";

export interface PaymentDoc {
  messBill?: Types.ObjectId;
  student?: Types.ObjectId;
  amount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status?: string;
  paymentMethod: string;
  createdAt: Date;
}

const PaymentSchema = new Schema<PaymentDoc>(
  {
    messBill: { type: Schema.Types.ObjectId, ref: "MessBill" },
    student: { type: Schema.Types.ObjectId, ref: "Student" },
    amount: { type: Number, required: true },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    status: String,
    paymentMethod: { type: String, default: "razorpay" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Payment = model<PaymentDoc>("Payment", PaymentSchema);

