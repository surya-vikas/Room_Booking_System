const { Booking, Room } = require("../models");
const { getDayBounds } = require("../utils/timeOverlap");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const validateDateInput = (value) => {
  if (!value) return null;

  const trimmed = String(value).trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const getAnalytics = async (req, res) => {
  try {
    const [
      totalRooms,
      totalBookings,
      pendingBookings,
      approvedBookings,
      cancelledBookings,
      rejectedBookings,
    ] =
      await Promise.all([
        Room.countDocuments(),
        Booking.countDocuments(),
        Booking.countDocuments({ status: "pending" }),
        Booking.countDocuments({ status: "approved" }),
        Booking.countDocuments({ status: "cancelled" }),
        Booking.countDocuments({ status: "rejected" }),
      ]);

    const roomStats = await Room.find({}, "name block totalBookings capacity").sort({
      totalBookings: -1,
    });

    const utilization = roomStats.map((room) => ({
      roomId: room._id,
      roomName: room.name,
      block: room.block,
      totalBookings: room.totalBookings,
      capacity: room.capacity,
    }));

    return res.status(200).json({
      summary: {
        totalRooms,
        totalBookings,
        pendingBookings,
        approvedBookings,
        cancelledBookings,
        rejectedBookings,
      },
      utilization,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getOccupancySnapshot = async (req, res) => {
  try {
    const { date, roomName } = req.query;
    const requestedDate = validateDateInput(date);

    if (!requestedDate) {
      return res.status(400).json({ message: "A valid date query is required" });
    }

    const { dayStart, dayEnd } = getDayBounds(requestedDate);

    if (roomName) {
      const normalizedRoomName = String(roomName).trim();
      const room = await Room.findOne({
        name: { $regex: `^${escapeRegex(normalizedRoomName)}$`, $options: "i" },
      }).select("name block capacity");

      if (!room) {
        return res.status(404).json({ message: "Room not found for the provided roomName" });
      }

      const bookings = await Booking.find({
        roomId: room._id,
        status: "approved",
        date: { $gte: dayStart, $lte: dayEnd },
      })
        .populate("userId", "name email role")
        .sort({ startTime: 1 })
        .select("startTime endTime status userId");

      return res.status(200).json({
        date: dayStart.toISOString(),
        room: {
          roomId: room._id,
          name: room.name,
          block: room.block,
          capacity: room.capacity,
        },
        isFilled: bookings.length > 0,
        approvedBookingCount: bookings.length,
        bookings: bookings.map((booking) => ({
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
        })),
      });
    }

    const [rooms, approvedBookings] = await Promise.all([
      Room.find().select("name block").sort({ name: 1 }),
      Booking.find({
        status: "approved",
        date: { $gte: dayStart, $lte: dayEnd },
      }).select("roomId"),
    ]);

    const filledRoomIdSet = new Set(approvedBookings.map((booking) => String(booking.roomId)));
    const filledRooms = rooms
      .filter((room) => filledRoomIdSet.has(String(room._id)))
      .map((room) => ({
        roomId: room._id,
        roomName: room.name,
        block: room.block,
      }));

    const totalRooms = rooms.length;
    const filledRoomsCount = filledRooms.length;
    const availableRooms = totalRooms - filledRoomsCount;
    const occupancyPercentage =
      totalRooms > 0 ? Number(((filledRoomsCount / totalRooms) * 100).toFixed(2)) : 0;

    return res.status(200).json({
      date: dayStart.toISOString(),
      summary: {
        totalRooms,
        filledRooms: filledRoomsCount,
        availableRooms,
        occupancyPercentage,
      },
      filledRoomsList: filledRooms,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getAnalytics,
  getOccupancySnapshot,
};
