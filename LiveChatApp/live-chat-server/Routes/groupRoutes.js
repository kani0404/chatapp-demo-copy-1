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
} = require("../Controllers/groupControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Group operations
router.post("/create", protect, createGroup);
router.get("/", protect, getGroupsForUser);
router.post("/message/send", protect, sendGroupMessage);
router.get("/:groupId/messages", protect, getGroupMessages);
router.delete("/message/:messageId", protect, deleteGroupMessage);

// Member operations
router.post("/:groupId/add-member", protect, addMemberToGroup);
router.post("/:groupId/remove-member", protect, removeMemberFromGroup);
router.post("/:groupId/leave", protect, leaveGroup);

module.exports = router;
