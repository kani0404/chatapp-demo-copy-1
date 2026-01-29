const express = require("express");
const {
  createGroup,
  getGroupsForUser,
  sendGroupMessage,
  getGroupMessages,
  addMemberToGroup,
  removeMemberFromGroup,
  leaveGroup,
  deleteGroupMessage,
  reactToGroupMessage,
} = require("../Controllers/groupControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Group operations
router.post("/create", protect, createGroup);
router.get("/", protect, getGroupsForUser);
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

router.post("/message/send", protect, upload.single('file'), sendGroupMessage);
router.get("/:groupId/messages", protect, getGroupMessages);
router.delete("/message/:messageId", protect, deleteGroupMessage);
router.post("/message/:messageId/react", protect, reactToGroupMessage);

// Member operations
router.post("/:groupId/add-member", protect, addMemberToGroup);
router.post("/:groupId/remove-member", protect, removeMemberFromGroup);
router.post("/:groupId/leave", protect, leaveGroup);

module.exports = router;
