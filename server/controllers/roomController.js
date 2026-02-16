const { Room, Booking } = require("../models");
const {
  parseTimeToMinutes,
  hasTimeOverlap,
  getDayBounds,
} = require("../utils/timeOverlap");

const isDateInPast = (inputDate) => {
  const target = new Date(inputDate);
  const today = new Date();

  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return target < today;
};

const addRoom = async (req, res) => {
  try {
    const { name, block, capacity, features } = req.body;

    if (!name || !block || capacity === undefined) {
      return res
        .status(400)
        .json({ message: "name, block and capacity are required" });
    }

    const room = await Room.create({
      name,
      block,
      capacity,
      features: Array.isArray(features) ? features : [],
    });

    return res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    return res.status(200).json({ rooms });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, block, capacity, features, totalBookings } = req.body;

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    if (name !== undefined) room.name = name;
    if (block !== undefined) room.block = block;
    if (capacity !== undefined) room.capacity = capacity;
    if (features !== undefined) room.features = Array.isArray(features) ? features : [];
    if (totalBookings !== undefined) room.totalBookings = totalBookings;

    await room.save();

    return res.status(200).json({
      message: "Room updated successfully",
      room,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await Room.findByIdAndDelete(id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    return res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const searchAvailableRooms = async (req, res) => {
  try {
    const { date, startTime, endTime, attendees, requiredFeatures = [] } = req.body;

    if (!date || !startTime || !endTime || attendees === undefined) {
      return res.status(400).json({
        message: "date, startTime, endTime and attendees are required",
      });
    }

    const requestedDate = new Date(date);
    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (isDateInPast(requestedDate)) {
      return res.status(400).json({ message: "Date cannot be in the past" });
    }

    const attendeeCount = Number(attendees);
    if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
      return res.status(400).json({ message: "attendees must be a positive integer" });
    }

    const requestedStart = parseTimeToMinutes(startTime);
    const requestedEnd = parseTimeToMinutes(endTime);
    if (requestedStart === null || requestedEnd === null) {
      return res
        .status(400)
        .json({ message: "Time must be in HH:MM 24-hour format" });
    }

    if (requestedStart >= requestedEnd) {
      return res.status(400).json({ message: "startTime must be earlier than endTime" });
    }

    const cleanRequiredFeatures = Array.isArray(requiredFeatures)
      ? requiredFeatures.map((feature) => String(feature).trim().toLowerCase()).filter(Boolean)
      : [];

    const roomsByCapacity = await Room.find({
      capacity: { $gte: attendeeCount },
    }).sort({ createdAt: -1 });

    let candidateRooms = roomsByCapacity;
    const roomSearchMeta = {};
    let fallbackUsed = false;

    if (cleanRequiredFeatures.length > 0) {
      const scoredRooms = roomsByCapacity.map((room) => {
        const normalizedRoomFeatures = new Set(
          (room.features || []).map((feature) => String(feature).trim().toLowerCase())
        );
        const featureMatchCount = cleanRequiredFeatures.filter((feature) =>
          normalizedRoomFeatures.has(feature)
        ).length;

        return {
          room,
          hasAllFeatures: featureMatchCount === cleanRequiredFeatures.length,
          featureMatchCount,
        };
      });

      const exactFeatureRooms = scoredRooms
        .filter((entry) => entry.hasAllFeatures)
        .map((entry) => entry.room);

      if (exactFeatureRooms.length > 0) {
        candidateRooms = exactFeatureRooms;
      } else {
        fallbackUsed = true;
        candidateRooms = scoredRooms
          .sort((left, right) => right.featureMatchCount - left.featureMatchCount)
          .map((entry) => entry.room);

        scoredRooms.forEach((entry) => {
          roomSearchMeta[String(entry.room._id)] = {
            partialFeatureMatch: true,
            featureMatchCount: entry.featureMatchCount,
            featureMatchTotal: cleanRequiredFeatures.length,
          };
        });
      }
    }

    if (candidateRooms.length === 0) {
      return res.status(200).json({
        rooms: [],
        includesOccupiedRooms: false,
        fallbackUsed,
      });
    }

    const { dayStart, dayEnd } = getDayBounds(requestedDate);

    const candidateRoomIds = candidateRooms.map((room) => room._id);
    const canViewOccupiedForOverride = ["department", "admin"].includes(req.user?.role);

    const bookingQuery = Booking.find({
      roomId: { $in: candidateRoomIds },
      status: "approved",
      date: { $gte: dayStart, $lte: dayEnd },
    }).select("roomId startTime endTime userId");

    if (canViewOccupiedForOverride) {
      bookingQuery.populate("userId", "name email role");
    }

    const sameDayBookings = await bookingQuery;

    const occupiedRoomIds = new Set();
    const occupiedRoomDetails = {};

    sameDayBookings.forEach((booking) => {
      const bookingStart = parseTimeToMinutes(booking.startTime);
      const bookingEnd = parseTimeToMinutes(booking.endTime);

      if (bookingStart === null || bookingEnd === null) return;

      const isOverlapping = hasTimeOverlap(
        requestedStart,
        requestedEnd,
        bookingStart,
        bookingEnd
      );
      if (isOverlapping) {
        const roomId = String(booking.roomId);
        occupiedRoomIds.add(roomId);

        if (!occupiedRoomDetails[roomId]) occupiedRoomDetails[roomId] = [];
        occupiedRoomDetails[roomId].push({
          bookingId: booking._id,
          startTime: booking.startTime,
          endTime: booking.endTime,
          user: booking.userId
            ? {
                name: booking.userId.name,
                email: booking.userId.email,
                role: booking.userId.role,
              }
            : null,
        });
      }
    });

    if (canViewOccupiedForOverride) {
      const roomsWithOccupancy = candidateRooms.map((room) => {
        const roomId = String(room._id);
        return {
          ...room.toObject(),
          ...(roomSearchMeta[roomId] || {}),
          isOccupied: occupiedRoomIds.has(roomId),
          occupiedBookings: occupiedRoomDetails[roomId] || [],
        };
      });

      return res.status(200).json({
        rooms: roomsWithOccupancy,
        includesOccupiedRooms: true,
        fallbackUsed,
      });
    }

    const availableRooms = candidateRooms.filter(
      (room) => !occupiedRoomIds.has(String(room._id))
    );

    return res.status(200).json({
      rooms: availableRooms.map((room) => {
        const roomId = String(room._id);
        return {
          ...room.toObject(),
          ...(roomSearchMeta[roomId] || {}),
        };
      }),
      includesOccupiedRooms: false,
      fallbackUsed,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getRoomOverview = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ block: 1, name: 1 });
    return res.status(200).json({ rooms });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getRoomSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const room = await Room.findById(id).select("name block capacity features");
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const scheduleQuery = { roomId: id, status: "approved" };

    if (date) {
      const requestedDate = new Date(date);
      if (Number.isNaN(requestedDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      const { dayStart, dayEnd } = getDayBounds(requestedDate);
      scheduleQuery.date = { $gte: dayStart, $lte: dayEnd };
    }

    const bookings = await Booking.find(scheduleQuery)
      .populate("userId", "name email role")
      .sort({ date: 1, startTime: 1 });

    return res.status(200).json({ room, bookings });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  addRoom,
  getAllRooms,
  updateRoom,
  deleteRoom,
  searchAvailableRooms,
  getRoomOverview,
  getRoomSchedule,
};
