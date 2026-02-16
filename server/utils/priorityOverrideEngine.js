const { Booking } = require("../models");
const { parseTimeToMinutes, hasTimeOverlap, getDayBounds } = require("./timeOverlap");
const {
  sendCancellationMessage,
  sendOverrideMessage,
} = require("../services/whatsappService");
const { randomUUID } = require("crypto");

const getNotificationRecipients = (booking) => {
  const recipients = new Set();
  [booking?.studentPhone].forEach((phone) => {
    if (phone && String(phone).trim()) recipients.add(String(phone).trim());
  });
  return Array.from(recipients);
};

const resolvePriorityConflicts = async ({
  roomId,
  date,
  startTime,
  endTime,
  newPriority,
  overridingUserId,
  overridingUserRole,
  overrideReason = "Cancelled due to some other important event",
}) => {
  const newStart = parseTimeToMinutes(startTime);
  const newEnd = parseTimeToMinutes(endTime);

  if (newStart === null || newEnd === null || newStart >= newEnd) {
    return {
      rejected: true,
      reason: "Invalid booking time range",
      conflictingBooking: null,
      cancelledBookings: [],
    };
  }

  const { dayStart, dayEnd } = getDayBounds(date);
  const approvedBookings = await Booking.find({
    roomId,
    status: "approved",
    date: { $gte: dayStart, $lte: dayEnd },
  }).populate("userId", "phone");

  const conflicts = approvedBookings.filter((existingBooking) => {
    const existingStart = parseTimeToMinutes(existingBooking.startTime);
    const existingEnd = parseTimeToMinutes(existingBooking.endTime);

    if (existingStart === null || existingEnd === null) {
      return false;
    }

    return hasTimeOverlap(newStart, newEnd, existingStart, existingEnd);
  });

  if (conflicts.length === 0) {
    return {
      rejected: false,
      conflictingBooking: null,
      cancelledBookings: [],
    };
  }

  const nonOverridableConflict = conflicts.find(
    (existingBooking) => newPriority <= existingBooking.priority
  );

  if (nonOverridableConflict) {
    return {
      rejected: true,
      reason: "New booking priority is not high enough",
      conflictingBooking: nonOverridableConflict,
      cancelledBookings: [],
    };
  }

  const cancelledBookings = [];
  const overrideBatchId = randomUUID();
  const overriddenAt = new Date();

  for (const booking of conflicts) {
    booking.status = "cancelled";
    booking.overrideReason = overrideReason;
    booking.overrideMetadata = {
      overrideBatchId,
      overriddenByUserId: overridingUserId,
      overriddenByRole: overridingUserRole,
      overriddenByPriority: newPriority,
      overridingRequestDate: new Date(date),
      overridingStartTime: startTime,
      overridingEndTime: endTime,
      overriddenAt,
    };
    await booking.save();

    cancelledBookings.push(booking);

    const recipients = getNotificationRecipients(booking);
    for (const recipient of recipients) {
      await sendCancellationMessage({
        to: recipient,
        booking,
        reason: overrideReason,
      });
      await sendOverrideMessage({
        to: recipient,
        booking,
        overridingPriority: newPriority,
      });
    }
  }

  return {
    rejected: false,
    conflictingBooking: null,
    cancelledBookings,
  };
};

module.exports = {
  resolvePriorityConflicts,
};
