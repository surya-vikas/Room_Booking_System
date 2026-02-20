const express = require("express");
const { getAnalytics, getOccupancySnapshot } = require("../controllers/adminController");
const {
  getUsers,
  createUser,
  setUserPauseStatus,
  resetUserPassword,
  deleteUser,
} = require("../controllers/adminUserController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/analytics", protect, authorize("admin"), getAnalytics);
router.get("/occupancy", protect, authorize("admin"), getOccupancySnapshot);
router.get("/users", protect, authorize("admin"), getUsers);
router.post("/users", protect, authorize("admin"), createUser);
router.patch("/users/:id/pause", protect, authorize("admin"), setUserPauseStatus);
router.patch("/users/:id/password", protect, authorize("admin"), resetUserPassword);
router.delete("/users/:id", protect, authorize("admin"), deleteUser);

module.exports = router;