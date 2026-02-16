const { register, login, getProfile, adminOnly } = require("./authController");
const {
  addRoom,
  getAllRooms,
  updateRoom,
  deleteRoom,
  searchAvailableRooms,
  getRoomOverview,
  getRoomSchedule,
} = require("./roomController");
const {
  createBooking,
  getBookingHistory,
  getPendingBookings,
  reviewBooking,
} = require("./bookingController");
const { getAnalytics, getOccupancySnapshot } = require("./adminController");

module.exports = {
  register,
  login,
  getProfile,
  adminOnly,
  addRoom,
  getAllRooms,
  updateRoom,
  deleteRoom,
  searchAvailableRooms,
  getRoomOverview,
  getRoomSchedule,
  createBooking,
  getBookingHistory,
  getPendingBookings,
  reviewBooking,
  getAnalytics,
  getOccupancySnapshot,
};
