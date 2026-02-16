const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { Booking, Room, User } = require("../models");

dotenv.config();

const BASE_PASSWORD = "123456";
const SLOT_TEMPLATES = [
  { startTime: "09:00", endTime: "12:00" },
  { startTime: "10:00", endTime: "13:00" },
  { startTime: "13:00", endTime: "16:00" },
  { startTime: "14:00", endTime: "17:30" },
];

const ensureUser = async ({ name, email, phone, role, department }) => {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) return existing;

  const hashedPassword = await bcrypt.hash(BASE_PASSWORD, 10);
  return User.create({
    name,
    email: normalizedEmail,
    phone,
    password: hashedPassword,
    role,
    department,
  });
};

const getDateAtMidnight = (offsetDays) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
};

const pickFeatures = (roomFeatures = []) => {
  if (!roomFeatures.length) return [];
  const featureCount = Math.min(roomFeatures.length, Math.max(1, Math.floor(Math.random() * 3)));
  return roomFeatures.slice(0, featureCount);
};

const upsertFakeBooking = async ({ room, user, date, startTime, endTime }) => {
  const existing = await Booking.findOne({
    roomId: room._id,
    date,
    startTime,
    endTime,
    status: "approved",
  });

  if (existing) return { created: false };

  const safeCapacity = Math.max(1, room.capacity || 1);
  const attendees = Math.max(1, Math.min(safeCapacity - 1, Math.floor(safeCapacity * 0.6)));

  await Booking.create({
    userId: user._id,
    roomId: room._id,
    date,
    startTime,
    endTime,
    attendees,
    requiredFeatures: pickFeatures(room.features),
    priority: user.priority,
    status: "approved",
    overrideReason: "",
  });

  return { created: true };
};

const refreshRoomBookingCounters = async () => {
  const counts = await Booking.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: "$roomId", total: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((item) => [String(item._id), item.total]));
  const rooms = await Room.find().select("_id");

  const updates = rooms.map((room) =>
    Room.updateOne(
      { _id: room._id },
      { $set: { totalBookings: countMap.get(String(room._id)) || 0 } }
    )
  );

  await Promise.all(updates);
};

const main = async () => {
  try {
    await connectDB();

    const seededUsers = [];
    seededUsers.push(
      await ensureUser({
        name: "User One",
        email: "user1@gmail.com",
        phone: "+10000000021",
        role: "student",
        department: "CSE",
      })
    );
    seededUsers.push(
      await ensureUser({
        name: "Department One",
        email: "dep1@gmail.com",
        phone: "+10000000022",
        role: "department",
        department: "Department 1",
      })
    );
    seededUsers.push(
      await ensureUser({
        name: "Department Two",
        email: "dep2@gmail.com",
        phone: "+10000000023",
        role: "department",
        department: "Department 2",
      })
    );
    seededUsers.push(
      await ensureUser({
        name: "Department Three",
        email: "dep3@gmail.com",
        phone: "+10000000024",
        role: "department",
        department: "Department 3",
      })
    );
    seededUsers.push(
      await ensureUser({
        name: "Admin User",
        email: "admin@gmail.com",
        phone: "+10000000025",
        role: "admin",
        department: "Administration",
      })
    );

    const rooms = await Room.find().sort({ block: 1, name: 1 });
    if (!rooms.length) {
      throw new Error("No rooms found. Seed rooms first.");
    }

    let createdCount = 0;
    let userIndex = 0;
    const targetRooms = rooms.slice(0, Math.min(36, rooms.length));

    for (let dayOffset = 0; dayOffset < 10; dayOffset += 1) {
      const date = getDateAtMidnight(dayOffset);
      for (let roomIndex = 0; roomIndex < targetRooms.length; roomIndex += 1) {
        const room = targetRooms[roomIndex];
        const template = SLOT_TEMPLATES[(roomIndex + dayOffset) % SLOT_TEMPLATES.length];
        const user = seededUsers[userIndex % seededUsers.length];
        userIndex += 1;

        const result = await upsertFakeBooking({
          room,
          user,
          date,
          startTime: template.startTime,
          endTime: template.endTime,
        });

        if (result.created) {
          createdCount += 1;
        }
      }
    }

    await refreshRoomBookingCounters();

    console.log(`Fake booking seed complete. Created ${createdCount} approved bookings.`);
    console.log("Dates covered: today + next 9 days");
    console.log(`Rooms covered: ${targetRooms.length}`);
  } catch (error) {
    console.error("Fake booking seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

main();

