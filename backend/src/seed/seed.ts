import { connectDb } from "../config/db";
import { env } from "../config/env";
import { Admin } from "../models/Admin";
import { Student } from "../models/Student";
import { Notice } from "../models/Notice";
import { MessBill } from "../models/MessBill";
import { Complaint } from "../models/Complaint";
import { MessMenu } from "../models/MessMenu";
import { SeatAvailability } from "../models/SeatAvailability";
import { hashPassword } from "../utils/password";

async function seed() {
  await connectDb();

  // wipe dev db collections (safe for local dev)
  await Promise.all([
    Admin.deleteMany({}),
    Student.deleteMany({}),
    Notice.deleteMany({}),
    MessBill.deleteMany({}),
    Complaint.deleteMany({}),
    MessMenu.deleteMany({}),
    SeatAvailability.deleteMany({}),
  ]);

  const pw = hashPassword("password");
  const [admin, warden] = await Admin.create([
    { username: "admin", passwordHash: pw, fullName: "Hostel Admin", role: "admin", email: "admin@jbh.dei.ac.in" },
    { username: "warden", passwordHash: pw, fullName: "Chief Warden", role: "warden", email: "warden@jbh.dei.ac.in" },
  ]);

  const student = await Student.create({
    studentId: "DEI-2K23-CS-042",
    passwordHash: pw,
    fullName: "Prashant kuamr jaiswal",
    email: "prashant@student.dei.ac.in",
    phone: "9876543210",
    roomNumber: "114",
    block: "A",
    roomType: "triple",
    course: "B.Sc CS",
    year: 2,
    department: "Computer Science",
    isActive: true,
  });

  await Notice.create([
    {
      title: "Mess Bill Payment Deadline Extended",
      content: "Due to technical issues, the payment deadline has been extended to 20th March 2025.",
      category: "urgent",
      createdBy: admin._id,
    },
    {
      title: "Annual Sports Day Registration Open",
      content: "All boarders are invited to register for Annual Sports Day events by 20th March.",
      category: "sports",
      createdBy: admin._id,
    },
    {
      title: "Water Supply Interruption – Block C",
      content: "Water supply in Block C will be interrupted from 8 AM to 12 PM on 16th March for pipeline maintenance.",
      category: "urgent",
      createdBy: admin._id,
    },
    {
      title: "New Mess Menu for April",
      content: "Revised mess menu for April 2025 has been uploaded to the student portal. Feedback welcome.",
      category: "mess",
      createdBy: admin._id,
    },
    {
      title: "Wi-Fi Upgrade Completed",
      content: "Campus-wide Wi-Fi has been upgraded to 100 Mbps fiber. New passwords posted on notice boards.",
      category: "general",
      createdBy: admin._id,
    },
  ]);

  await MessBill.create([
    { student: student._id, monthYear: "2025-01", amount: 2750, dueDate: new Date("2025-01-15"), status: "paid" },
    { student: student._id, monthYear: "2025-02", amount: 2680, dueDate: new Date("2025-02-15"), status: "paid" },
    { student: student._id, monthYear: "2025-03", amount: 2850, dueDate: new Date("2025-03-20"), status: "pending" },
  ]);

  await SeatAvailability.create([
    { roomType: "Double Sharing", totalSeats: 80, availableSeats: 18 },
    { roomType: "Triple Sharing", totalSeats: 120, availableSeats: 6 },
    { roomType: "Single Room", totalSeats: 20, availableSeats: 0 },
    { roomType: "Reserved Category", totalSeats: 20, availableSeats: 4 },
  ]);

  await Complaint.create([
    {
      student: student._id,
      subject: "Bulb replacement – Room 114",
      description: "One bulb in the room is fused and needs replacement.",
      category: "electrical",
      roomLocation: "Room 114",
      status: "resolved",
      resolvedBy: warden._id,
      resolvedAt: new Date("2025-03-02T10:00:00Z"),
      createdAt: new Date("2025-03-02T10:00:00Z"),
      updatedAt: new Date("2025-03-03T10:00:00Z"),
    },
    {
      student: student._id,
      subject: "Leaking tap – Bathroom 1",
      description: "Tap in bathroom 1 is leaking continuously.",
      category: "plumbing",
      roomLocation: "Block A Bathroom",
      status: "in_progress",
      createdAt: new Date("2025-03-08T14:30:00Z"),
      updatedAt: new Date("2025-03-09T14:30:00Z"),
    },
    {
      student: student._id,
      subject: "Fan not working – Room 114",
      description: "Ceiling fan in room 114 is not rotating properly.",
      category: "electrical",
      roomLocation: "Room 114",
      status: "pending",
      createdAt: new Date("2025-03-11T09:00:00Z"),
      updatedAt: new Date("2025-03-11T09:00:00Z"),
    },
  ]);

  const weekStart = new Date("2025-03-10");
  await MessMenu.create([
    { dayOfWeek: 1, breakfast: "Poha + Tea", lunch: "Dal Tadka, Rice, Roti", dinner: "Paneer Sabzi, Roti", snacks: "Biscuits", weekStart },
    { dayOfWeek: 2, breakfast: "Upma + Juice", lunch: "Chole, Rice, Salad", dinner: "Aloo Matar, Roti", snacks: "Banana", weekStart },
    { dayOfWeek: 3, breakfast: "Idli Sambhar", lunch: "Rajma, Rice, Raita", dinner: "Mix Veg, Roti", snacks: "Milk", weekStart },
    { dayOfWeek: 4, breakfast: "Paratha + Curd", lunch: "Dal Makhani, Rice", dinner: "Kadhi, Rice, Roti", snacks: "Chai", weekStart },
    { dayOfWeek: 5, breakfast: "Bread + Butter", lunch: "Palak Paneer, Rice", dinner: "Special Sabzi, Roti", snacks: "Cake", weekStart },
    { dayOfWeek: 6, breakfast: "Puri + Halwa", lunch: "Special Meal", dinner: "Biryani + Raita", snacks: "Snacks", weekStart },
    { dayOfWeek: 0, breakfast: "Aloo Paratha", lunch: "Rajma Chawal", dinner: "Pav Bhaji", snacks: "Milk", weekStart },
  ]);

  // eslint-disable-next-line no-console
  console.log("Seed complete:", {
    mongodb: env.MONGODB_URI,
    studentLogin: { userId: "DEI-2K23-CS-042", password: "password", role: "student" },
    adminLogin: { userId: "admin", password: "password", role: "admin" },
    wardenLogin: { userId: "warden", password: "password", role: "warden" },
  });
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

