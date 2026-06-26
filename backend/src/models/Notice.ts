import { Schema, model, Types } from "mongoose";

export type NoticeCategory = "urgent" | "general" | "mess" | "sports" | "maintenance" | "admin";

export interface NoticeDoc {
  title: string;
  content?: string;
  category: NoticeCategory;
  attachment?: string;
  createdBy?: Types.ObjectId;
  isPinned: boolean;
  createdAt: Date;
}

const NoticeSchema = new Schema<NoticeDoc>(
  {
    title: { type: String, required: true },
    content: String,
    category: {
      type: String,
      enum: ["urgent", "general", "mess", "sports", "maintenance", "admin"],
      default: "general",
      index: true,
    },
    attachment: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    isPinned: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notice = model<NoticeDoc>("Notice", NoticeSchema);

