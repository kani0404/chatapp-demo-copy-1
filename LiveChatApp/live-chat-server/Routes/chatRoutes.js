const express = require("express");
const {
  accessChat,
  fetchChats,
  createGroupChat,
  groupExit,
  fetchGroups,
  deleteChat,
} = require("../Controllers/chatControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").post(protect, accessChat);
router.route("/").get(protect, fetchChats);
router.route("/fetchGroups").get(protect, fetchGroups);
router.route("/createGroup").post(protect, createGroupChat);
router.route("/groupExit").put(protect, groupExit);
router.route("/:chatId").delete(protect, deleteChat);

module.exports = router;module.exports = router;
