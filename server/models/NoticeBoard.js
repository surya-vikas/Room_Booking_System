const mongoose = require("mongoose");

const noticeBoardSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      trim: true,
      default: "",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const NoticeBoard = mongoose.model("NoticeBoard", noticeBoardSchema);

module.exports = {
  NoticeBoard,
};
