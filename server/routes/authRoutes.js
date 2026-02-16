const express = require("express");
const {
  login,
  getProfile,
  adminOnly,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.get("/me", protect, getProfile);
router.get("/admin-only", protect, authorize("admin"), adminOnly);

module.exports = router;
