const express = require("express");
const {
  createBooking,
  getBookingHistory,
  getPendingBookings,
  reviewBooking,
} = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createBooking);
router.get("/history", protect, getBookingHistory);
router.get("/pending", protect, authorize("admin", "department"), getPendingBookings);
router.patch("/:id/review", protect, authorize("admin"), reviewBooking);

module.exports = router;