import { Schema, model } from "mongoose";

export interface MessMenuDoc {
  dayOfWeek: number; // 0=Sun..6=Sat
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  snacks?: string;
  weekStart?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessMenuSchema = new Schema<MessMenuDoc>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6, index: true },
    breakfast: String,
    lunch: String,
    dinner: String,
    snacks: String,
    weekStart: Date,
  },
  { timestamps: true }
);

MessMenuSchema.index({ weekStart: -1, dayOfWeek: 1 });

export const MessMenu = model<MessMenuDoc>("MessMenu", MessMenuSchema);

