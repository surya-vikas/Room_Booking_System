const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const { User, Room, Booking } = require("../models");

dotenv.config();

const API_BASE =
  process.env.DEMO_API_BASE_URL || "https://room-booking-system-4hxr.onrender.com/api";
const STUDENT_EMAIL = process.env.DEMO_STUDENT_EMAIL || "student.demo@smartspace.dev";
const STUDENT_PASSWORD = process.env.DEMO_STUDENT_PASSWORD || "Demo@123";
const DEPARTMENT_EMAIL = process.env.DEMO_DEPARTMENT1_EMAIL || "dep1@gmail.com";
const DEPARTMENT_PASSWORD = process.env.DEMO_DEPARTMENT_PASSWORD || "123456";
const ROOM_NAME = process.env.DEMO_ROOM_NAME || "Demo Auditorium";
const ROOM_BLOCK = process.env.DEMO_ROOM_BLOCK || "A";

const toDateOnly = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDemoDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateOnly(tomorrow).toISOString().slice(0, 10);
};

const apiPost = async (path, payload, token) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = { message: "Invalid JSON response" };
  }

  return { status: response.status, ok: response.ok, data };
};

const login = async (email, password) => {
  const result = await apiPost("/auth/login", { email, password });
  if (!result.ok || !result.data.token) {
    throw new Error(`Login failed for ${email}: ${result.data.message || result.status}`);
  }
  return result.data.token;
};

const book = async (token, payload) => {
  return apiPost("/bookings", payload, token);
};

const printResult = (label, result) => {
  const outcome = result.data.bookingOutcome || "N/A";
  console.log(`${label}: HTTP ${result.status} | outcome=${outcome} | message=${result.data.message}`);
};

const main = async () => {
  try {
    await connectDB();

    const studentUser = await User.findOne({ email: STUDENT_EMAIL.toLowerCase().trim() });
    const departmentUser = await User.findOne({ email: DEPARTMENT_EMAIL.toLowerCase().trim() });
    const room = await Room.findOne({ name: ROOM_NAME, block: ROOM_BLOCK });

    if (!studentUser || !departmentUser || !room) {
      throw new Error("Missing demo users/room. Run: npm run seed:demo");
    }

    const date = getDemoDateString();
    const bookingPayload = {
      roomId: room._id,
      date,
      startTime: "10:00",
      endTime: "12:00",
      attendees: 30,
      requiredFeatures: ["projector"],
    };

    console.log("\nDemo sequence starting...");
    console.log(`Date/slot: ${date} 10:00-12:00`);
    console.log(`Room: ${room.name} (${room.block})`);

    const studentToken = await login(STUDENT_EMAIL, STUDENT_PASSWORD);
    const studentBookingResult = await book(studentToken, bookingPayload);
    printResult("1) Student booking", studentBookingResult);

    const departmentToken = await login(DEPARTMENT_EMAIL, DEPARTMENT_PASSWORD);
    const departmentBookingResult = await book(departmentToken, bookingPayload);
    printResult("2) Department booking", departmentBookingResult);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      roomId: room._id,
      date: { $gte: dayStart, $lte: dayEnd },
      startTime: "10:00",
      endTime: "12:00",
    })
      .populate("userId", "email role")
      .sort({ createdAt: 1 });

    console.log("\nFinal booking states:");
    bookings.forEach((booking) => {
      console.log(
        `- ${booking.userId?.email || booking.userId} (${booking.userId?.role || "unknown"}) => ${booking.status}`
      );
      if (booking.overrideReason) {
        console.log(`  overrideReason: ${booking.overrideReason}`);
      }
    });

    console.log("\nExpected demo proof:");
    console.log("- Student auto-cancelled");
    console.log("- Department approved");
    console.log("- WhatsApp triggered (if Twilio env is configured)");
  } catch (error) {
    console.error("Demo run failed:", error.message);
    console.error("Ensure API server is running on", API_BASE);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

main();
