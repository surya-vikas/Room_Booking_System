const { Booking, Room } = require("../models");
const { resolvePriorityConflicts } = require("../utils/priorityOverrideEngine");
const {
  sendApprovalMessage,
  sendCancellationMessage,
  sendMessageWithFallback,
} = require("../services/whatsappService");
const { parseTimeToMinutes } = require("../utils/timeOverlap");

const isDateInPast = (inputDate) => {
  const target = new Date(inputDate);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return target < today;
};

const isValidPhone = (value) => {
  if (!value) return false;
  const normalized = String(value).trim().replace(/^whatsapp:/, "");
  return /^\+?[1-9]\d{7,14}$/.test(normalized);
};

const getNotificationRecipients = (booking) => {
  const recipients = new Set();
  [booking?.studentPhone].forEach((phone) => {
    if (phone && String(phone).trim()) recipients.add(String(phone).trim());
  });
  return Array.from(recipients);
};

const createBooking = async (req, res) => {
  try {
    const {
      roomId,
      date,
      startTime,
      endTime,
      attendees,
      requiredFeatures = [],
      studentPhone,
      bookingPurpose,
    } = req.body;

    if (
      !roomId ||
      !date ||
      !startTime ||
      !endTime ||
      attendees === undefined ||
      !studentPhone
    ) {
      return res.status(400).json({
        message: "roomId, date, startTime, endTime, attendees and studentPhone are required",
      });
    }

    if (!isValidPhone(studentPhone)) {
      return res.status(400).json({
        message: "studentPhone must be a valid phone number",
      });
    }

    const normalizedPurpose = String(bookingPurpose || "").trim();
    const requiresPurposeBrief = req.user.role !== "admin";
    if (requiresPurposeBrief && normalizedPurpose.length < 8) {
      return res.status(400).json({
        message: "bookingPurpose must be at least 8 characters for this role",
      });
    }

    const bookingDate = new Date(date);
    if (Number.isNaN(bookingDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (isDateInPast(bookingDate)) {
      return res.status(400).json({ message: "Date cannot be in the past" });
    }

    const startInMinutes = parseTimeToMinutes(startTime);
    const endInMinutes = parseTimeToMinutes(endTime);
    if (startInMinutes === null || endInMinutes === null) {
      return res
        .status(400)
        .json({ message: "Time must be in HH:MM 24-hour format" });
    }

    if (startInMinutes >= endInMinutes) {
      return res.status(400).json({ message: "startTime must be earlier than endTime" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const attendeeCount = Number(attendees);
    if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
      return res.status(400).json({ message: "attendees must be a positive integer" });
    }

    if (attendeeCount > room.capacity) {
      return res.status(400).json({ message: "Attendees exceed room capacity" });
    }

    const normalizedFeatures = Array.isArray(requiredFeatures)
      ? requiredFeatures.map((feature) => String(feature).trim()).filter(Boolean)
      : [];

    const roomFeatures = new Set(room.features.map((feature) => String(feature)));
    const missingFeature = normalizedFeatures.find((feature) => !roomFeatures.has(feature));
    if (missingFeature) {
      return res.status(400).json({
        message: `Room does not support required feature: ${missingFeature}`,
      });
    }

    const pendingBooking = await Booking.create({
      userId: req.user._id,
      roomId,
      date,
      startTime,
      endTime,
      attendees: attendeeCount,
      requiredFeatures: normalizedFeatures,
      bookingPurpose: normalizedPurpose,
      studentPhone: String(studentPhone).trim(),
      priority: req.user.priority,
      status: "pending",
    });

    const pendingBody =
      `Booking Request Submitted\n` +
      `Room: ${room.name}\n` +
      `Date: ${new Date(date).toDateString()}\n` +
      `Time: ${startTime} - ${endTime}\n` +
      `${normalizedPurpose ? `Purpose: ${normalizedPurpose}\n` : ""}` +
      `Status: Pending admin approval`;
    const submissionRecipients = getNotificationRecipients(pendingBooking);
    for (const recipient of submissionRecipients) {
      await sendMessageWithFallback({ to: recipient, body: pendingBody });
    }

    return res.status(201).json({
      message: "Booking submitted for admin approval",
      bookingOutcome: "PENDING",
      booking: pendingBooking,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getPendingBookings = async (req, res) => {
  try {
    const pendingBookings = await Booking.find({ status: "pending" })
      .populate("roomId", "name block capacity")
      .populate("userId", "name email phone role priority department")
      .sort({ createdAt: -1 });

    return res.status(200).json({ bookings: pendingBookings });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const reviewBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    const booking = await Booking.findById(id)
      .populate("userId", "phone role")
      .populate("roomId", "name");
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ message: "Only pending bookings can be reviewed" });
    }

    if (action === "reject") {
      booking.status = "rejected";
      booking.overrideReason = reason || "Rejected by admin";
      await booking.save();

      const recipients = getNotificationRecipients(booking);
      for (const recipient of recipients) {
        await sendCancellationMessage({
          to: recipient,
          booking,
          reason: booking.overrideReason,
        });
      }

      return res.status(200).json({
        message: "Booking rejected",
        bookingOutcome: "REJECTED",
        booking,
      });
    }

    if (action !== "approve") {
      return res.status(400).json({ message: "Invalid action. Use approve or reject." });
    }

    const conflictResult = await resolvePriorityConflicts({
      roomId: booking.roomId._id,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      newPriority: booking.priority,
      overridingUserId: booking.userId?._id,
      overridingUserRole: booking.userId?.role,
    });

    if (conflictResult.rejected) {
      booking.status = "rejected";
      booking.overrideReason = conflictResult.reason;
      await booking.save();

      const recipients = getNotificationRecipients(booking);
      for (const recipient of recipients) {
        await sendCancellationMessage({
          to: recipient,
          booking,
          reason: conflictResult.reason,
        });
      }

      return res.status(200).json({
        message: "Booking rejected due to priority conflict",
        bookingOutcome: "REJECTED",
        booking,
      });
    }

    booking.status = "approved";
    booking.overrideReason = "";
    await booking.save();

    const room = await Room.findById(booking.roomId._id);
    if (room) {
      room.totalBookings += 1;
      await room.save();
    }

    const recipients = getNotificationRecipients(booking);
    for (const recipient of recipients) {
      await sendApprovalMessage({
        to: recipient,
        booking,
        roomName: booking.roomId?.name || "Room",
      });
    }

    return res.status(200).json({
      message:
        conflictResult.cancelledBookings.length > 0
          ? "Booking approved with overrides"
          : "Booking approved",
      bookingOutcome:
        conflictResult.cancelledBookings.length > 0 ? "OVERRIDDEN" : "APPROVED",
      booking,
      cancelledBookingIds: conflictResult.cancelledBookings.map((item) => item._id),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getBookingHistory = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const query = isAdmin ? {} : { userId: req.user._id };

    const bookings = await Booking.find(query)
      .populate("roomId", "name block")
      .populate("userId", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      scope: isAdmin ? "all" : "own",
      bookings,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  createBooking,
  getBookingHistory,
  getPendingBookings,
  reviewBooking,
};
