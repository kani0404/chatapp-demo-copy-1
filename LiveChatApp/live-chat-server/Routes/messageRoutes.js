const express = require("express");
const {
  allMessages,
  sendMessage,
  updateMessageStatus,
  markMessageAsRead,
  deleteMessage,
} = require("../controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Specific routes FIRST (before generic :id routes)
router.route("/status/update").post(protect, updateMessageStatus);
router.route("/read/mark").post(protect, markMessageAsRead);

// Generic routes LAST
router.route("/").post(protect, sendMessage);
router.route("/:messageId").delete(protect, deleteMessage);
router.route("/:chatId").get(protect, allMessages);

module.exports = router;
