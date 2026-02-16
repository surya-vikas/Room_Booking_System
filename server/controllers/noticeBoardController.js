const { NoticeBoard } = require("../models");

const serializeNotice = (notice) => ({
  content: notice?.content || "",
  updatedAt: notice?.updatedAt || null,
  updatedBy: notice?.updatedBy
    ? {
        id: notice.updatedBy._id,
        name: notice.updatedBy.name,
        email: notice.updatedBy.email,
      }
    : null,
});

const getNoticeBoard = async (req, res) => {
  try {
    const notice = await NoticeBoard.findOne({})
      .sort({ updatedAt: -1 })
      .populate("updatedBy", "name email");

    return res.status(200).json({ notice: serializeNotice(notice) });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateNoticeBoard = async (req, res) => {
  try {
    const content = typeof req.body?.content === "string" ? req.body.content : "";

    if (content.length > 5000) {
      return res.status(400).json({ message: "Notice content must be 5000 characters or less" });
    }

    const notice = await NoticeBoard.findOneAndUpdate(
      {},
      {
        content,
        updatedBy: req.user._id,
        updatedAt: new Date(),
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).populate("updatedBy", "name email");

    return res.status(200).json({
      message: "Notice board updated",
      notice: serializeNotice(notice),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getNoticeBoard,
  updateNoticeBoard,
};
