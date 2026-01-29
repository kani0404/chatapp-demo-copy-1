const express = require("express");
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage });

const {
  allMessages,
  sendMessage,
  updateMessageStatus,
  markMessageAsRead,
  deleteMessage,
  reactToMessage,
} = require("../Controllers/messageControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Specific routes FIRST (before generic :id routes)
router.route("/status/update").post(protect, updateMessageStatus);
router.route("/read/mark").post(protect, markMessageAsRead);

// Generic routes LAST
router.route("/").post(protect, upload.single('file'), sendMessage);
router.route("/:messageId/react").post(protect, reactToMessage);
router.route("/:messageId").delete(protect, deleteMessage);
router.route("/:chatId").get(protect, allMessages);

module.exports = router;
