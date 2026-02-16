const express = require("express");
const {
  getNoticeBoard,
  updateNoticeBoard,
} = require("../controllers/noticeBoardController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getNoticeBoard);
router.put("/", protect, authorize("admin"), updateNoticeBoard);

module.exports = router;
