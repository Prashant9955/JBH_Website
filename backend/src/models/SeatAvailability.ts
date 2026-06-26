import { Schema, model } from "mongoose";

export interface SeatAvailabilityDoc {
  roomType: string;
  totalSeats: number;
  availableSeats: number;
  updatedAt: Date;
}

const SeatAvailabilitySchema = new Schema<SeatAvailabilityDoc>(
  {
    roomType: { type: String, required: true, unique: true },
    totalSeats: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const SeatAvailability = model<SeatAvailabilityDoc>("SeatAvailability", SeatAvailabilitySchema);

