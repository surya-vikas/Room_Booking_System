const mongoose = require("mongoose");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const { Room } = require("../models");

dotenv.config();

const BLOCKS = [4, 8, 1, 2];
const FLOORS = [1, 2, 3, 4];
const ROOMS_PER_FLOOR = 12;

const generateRooms = () => {
  const rooms = [];

  for (const block of BLOCKS) {
    for (const floor of FLOORS) {
      for (let n = 1; n <= ROOMS_PER_FLOOR; n += 1) {
        const roomNo = `${block}${floor}${String(n).padStart(2, "0")}`;
        rooms.push({
          name: roomNo,
          block: String(block),
          capacity: 60,
          features: [],
        });
      }
    }
  }

  return rooms;
};

const main = async () => {
  try {
    await connectDB();

    const targetRooms = generateRooms();
    let created = 0;
    let updated = 0;

    for (const roomData of targetRooms) {
      const existing = await Room.findOne({ name: roomData.name, block: roomData.block });

      if (!existing) {
        await Room.create(roomData);
        created += 1;
      } else {
        existing.capacity = roomData.capacity;
        existing.features = roomData.features;
        await existing.save();
        updated += 1;
      }
    }

    console.log(`Bulk room seed complete. Created: ${created}, Updated: ${updated}, Total target: ${targetRooms.length}`);
  } catch (error) {
    console.error("Bulk room seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

main();
