const express = require("express");
const {
  addRoom,
  getAllRooms,
  updateRoom,
  deleteRoom,
  searchAvailableRooms,
  getRoomOverview,
  getRoomSchedule,
} = require("../controllers/roomController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/search", protect, searchAvailableRooms);
router.get("/overview", protect, getRoomOverview);
router.get("/:id/schedule", protect, getRoomSchedule);
router.post("/", protect, authorize("admin"), addRoom);
router.get("/", protect, authorize("admin"), getAllRooms);
router.put("/:id", protect, authorize("admin"), updateRoom);
router.delete("/:id", protect, authorize("admin"), deleteRoom);

module.exports = router;
