import { Schema, model } from "mongoose";

export type RoomType = "single" | "double" | "triple" | "reserved";

export interface StudentDoc {
  studentId: string;
  passwordHash: string;
  fullName: string;
  email?: string;
  phone?: string;
  roomNumber?: string;
  block?: string;
  roomType?: RoomType;
  course?: string;
  year?: number;
  department?: string;
  guardianName?: string;
  guardianPhone?: string;
  profilePhoto?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<StudentDoc>(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true },
    email: String,
    phone: String,
    roomNumber: String,
    block: { type: String, default: "A" },
    roomType: { type: String, enum: ["single", "double", "triple", "reserved"], default: "triple" },
    course: String,
    year: Number,
    department: String,
    guardianName: String,
    guardianPhone: String,
    profilePhoto: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Student = model<StudentDoc>("Student", StudentSchema);

