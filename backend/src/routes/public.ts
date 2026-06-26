import { Router } from "express";
import { z } from "zod";
import { ContactSubmission } from "../models/ContactSubmission";
import { SeatAvailability } from "../models/SeatAvailability";

export const publicRouter = Router();

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().or(z.literal("")),
  query_type: z.string().optional().or(z.literal("")),
  message: z.string().min(1),
});

publicRouter.post("/contact", async (req, res) => {
  const parsed = ContactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Please fill all required fields" });
  const { name, email, phone, query_type, message } = parsed.data;
  await ContactSubmission.create({
    name,
    email,
    phone: phone || undefined,
    queryType: query_type || undefined,
    message,
  });
  return res.json({ success: true, message: "Thank you! Your message has been sent." });
});

publicRouter.get("/seat-availability", async (_req, res) => {
  const seats = await SeatAvailability.find({}).sort({ roomType: 1 }).lean().exec();
  res.json({ success: true, seats });
});

