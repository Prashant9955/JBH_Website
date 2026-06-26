import { Schema, model } from "mongoose";

export interface ContactSubmissionDoc {
  name: string;
  email: string;
  phone?: string;
  queryType?: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

const ContactSubmissionSchema = new Schema<ContactSubmissionDoc>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: String,
    queryType: String,
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ContactSubmission = model<ContactSubmissionDoc>("ContactSubmission", ContactSubmissionSchema);

