const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const roomRoutes = require("./roomRoutes");
const bookingRoutes = require("./bookingRoutes");
const adminRoutes = require("./adminRoutes");
const noticeBoardRoutes = require("./noticeBoardRoutes");

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.use("/auth", authRoutes);
router.use("/rooms", roomRoutes);
router.use("/bookings", bookingRoutes);
router.use("/admin", adminRoutes);
router.use("/notice-board", noticeBoardRoutes);

module.exports = router;
