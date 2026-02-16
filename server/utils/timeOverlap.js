const { Booking } = require("../models");

const parseTimeToMinutes = (timeString) => {
  if (typeof timeString !== "string") return null;
  const match = timeString.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
};

const hasTimeOverlap = (newStart, newEnd, existingStart, existingEnd) => {
  return newStart < existingEnd && newEnd > existingStart;
};

const getDayBounds = (dateInput) => {
  const date = new Date(dateInput);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return { dayStart, dayEnd };
};

const hasApprovedOverlapForRoom = async ({
  roomId,
  date,
  startTime,
  endTime,
  excludeBookingId,
}) => {
  const requestedStart = parseTimeToMinutes(startTime);
  const requestedEnd = parseTimeToMinutes(endTime);

  if (requestedStart === null || requestedEnd === null) {
    return true;
  }

  const { dayStart, dayEnd } = getDayBounds(date);

  const query = {
    roomId,
    status: "approved",
    date: { $gte: dayStart, $lte: dayEnd },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const existingBookings = await Booking.find(query).select("startTime endTime");

  return existingBookings.some((booking) => {
    const existingStart = parseTimeToMinutes(booking.startTime);
    const existingEnd = parseTimeToMinutes(booking.endTime);
    if (existingStart === null || existingEnd === null) return false;
    return hasTimeOverlap(requestedStart, requestedEnd, existingStart, existingEnd);
  });
};

module.exports = {
  parseTimeToMinutes,
  hasTimeOverlap,
  getDayBounds,
  hasApprovedOverlapForRoom,
};
