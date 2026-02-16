const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const { User, Room, Booking } = require("../models");

dotenv.config();

const DEMO = {
  student: {
    name: "Student User 1",
    email: process.env.DEMO_STUDENT_EMAIL || "user1@gmail.com",
    phone: process.env.DEMO_STUDENT_PHONE || "+10000000001",
    password: process.env.DEMO_STUDENT_PASSWORD || "123456",
    role: "student",
    department: "CSE",
  },
  departments: [
    {
      name: "Department User 1",
      email: process.env.DEMO_DEPARTMENT1_EMAIL || "dep1@gmail.com",
      phone: process.env.DEMO_DEPARTMENT1_PHONE || "+10000000011",
      password: process.env.DEMO_DEPARTMENT_PASSWORD || "123456",
      role: "department",
      department: "Department 1",
    },
    {
      name: "Department User 2",
      email: process.env.DEMO_DEPARTMENT2_EMAIL || "dep2@gmail.com",
      phone: process.env.DEMO_DEPARTMENT2_PHONE || "+10000000012",
      password: process.env.DEMO_DEPARTMENT_PASSWORD || "123456",
      role: "department",
      department: "Department 2",
    },
    {
      name: "Department User 3",
      email: process.env.DEMO_DEPARTMENT3_EMAIL || "dep3@gmail.com",
      phone: process.env.DEMO_DEPARTMENT3_PHONE || "+10000000013",
      password: process.env.DEMO_DEPARTMENT_PASSWORD || "123456",
      role: "department",
      department: "Department 3",
    },
  ],
  admin: {
    name: "Admin User",
    email: process.env.DEMO_ADMIN_EMAIL || "admin@gmail.com",
    phone: process.env.DEMO_ADMIN_PHONE || "+10000000014",
    password: process.env.DEMO_ADMIN_PASSWORD || "123456",
    role: "admin",
    department: "Administration",
  },
  room: {
    name: process.env.DEMO_ROOM_NAME || "Demo Auditorium",
    block: process.env.DEMO_ROOM_BLOCK || "A",
    capacity: Number(process.env.DEMO_ROOM_CAPACITY || 120),
    features: ["projector", "ac", "wifi"],
  },
};

const toDateOnly = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getDemoDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateOnly(tomorrow);
};

const upsertUser = async (userData) => {
  const existing = await User.findOne({ email: userData.email.toLowerCase().trim() });
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  if (!existing) {
    return User.create({ ...userData, password: hashedPassword });
  }

  existing.name = userData.name;
  existing.phone = userData.phone;
  existing.password = hashedPassword;
  existing.role = userData.role;
  existing.department = userData.department;
  await existing.save();
  return existing;
};

const upsertRoom = async (roomData) => {
  const existing = await Room.findOne({ name: roomData.name, block: roomData.block });

  if (!existing) {
    return Room.create(roomData);
  }

  existing.capacity = roomData.capacity;
  existing.features = roomData.features;
  await existing.save();
  return existing;
};

const main = async () => {
  try {
    await connectDB();

    const student = await upsertUser(DEMO.student);
    const departments = [];
    for (const departmentConfig of DEMO.departments) {
      const departmentUser = await upsertUser(departmentConfig);
      departments.push(departmentUser);
    }
    const admin = await upsertUser(DEMO.admin);
    const room = await upsertRoom(DEMO.room);

    const demoDate = getDemoDate();
    const endOfDay = new Date(demoDate);
    endOfDay.setHours(23, 59, 59, 999);

    await Booking.deleteMany({
      roomId: room._id,
      date: { $gte: demoDate, $lte: endOfDay },
      startTime: "10:00",
      endTime: "12:00",
    });

    console.log("Demo seed complete");
    console.log(`Student login: ${student.email} / ${DEMO.student.password}`);
    departments.forEach((departmentUser, index) => {
      console.log(
        `Department ${index + 1} login: ${departmentUser.email} / ${DEMO.departments[index].password}`
      );
    });
    console.log(`Admin login: ${admin.email} / ${DEMO.admin.password}`);
    console.log(`Room: ${room.name} (${room.block})`);
    console.log(`Slot prepared: ${demoDate.toISOString().slice(0, 10)} 10:00-12:00`);
  } catch (error) {
    console.error("Demo seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

main();
