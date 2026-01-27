const express = require("express");
const {
  allMessages,
  sendMessage,
  updateMessageStatus,
  markMessageAsRead,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/:chatId").get(protect, allMessages);
router.route("/").post(protect, sendMessage);
router.route("/status/update").post(protect, updateMessageStatus);
router.route("/read/mark").post(protect, markMessageAsRead);

module.exports = router;
