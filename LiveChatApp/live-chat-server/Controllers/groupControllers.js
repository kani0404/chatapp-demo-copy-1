const asyncHandler = require("express-async-handler");
const Group = require("../modals/groupModel");
const GroupMessage = require("../modals/groupMessageModel");
const User = require("../modals/userModel");

// Create a new group
const createGroup = asyncHandler(async (req, res) => {
  const { groupName, members } = req.body;

  if (!groupName) {
    res.status(400);
    throw new Error("Group name is required");
  }

  if (!members || members.length === 0) {
    res.status(400);
    throw new Error("At least one member is required");
  }

  try {
    // Ensure the creator is added to the group
    const memberIds = members.filter(
      (memberId) => memberId.toString() !== req.user._id.toString()
    );
    memberIds.push(req.user._id);

    const group = await Group.create({
      groupName: groupName,
      members: memberIds,
      admin: req.user._id,
    });

    const fullGroup = await Group.findById(group._id)
      .populate("members", "-password")
      .populate("admin", "-password");

    res.status(201).json(fullGroup);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Get all groups for logged-in user
const getGroupsForUser = asyncHandler(async (req, res) => {
  try {
    const groups = await Group.find({
      members: { $elemMatch: { $eq: req.user._id } },
      isActive: true,
    })
      .populate("members", "-password")
      .populate("admin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    // Populate the sender info in latestMessage
    const populatedGroups = await User.populate(groups, {
      path: "latestMessage.sender",
      select: "name email",
    });

    res.status(200).json(populatedGroups);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Send a message to group
const sendGroupMessage = asyncHandler(async (req, res) => {
  console.log("=== RECEIVED MESSAGE REQUEST ===");
  console.log("Request body:", req.body);
  console.log("User ID:", req.user?._id);
  console.log("Body keys:", Object.keys(req.body));

  const { content, groupId } = req.body;

  console.log("Extracted content:", content);
  console.log("Extracted groupId:", groupId);

  if (!content || !groupId) {
    console.error("Validation failed - missing fields:");
    console.error("  content:", content ? "✓" : "✗ MISSING");
    console.error("  groupId:", groupId ? "✓" : "✗ MISSING");
    res.status(400);
    throw new Error("Invalid data passed into request");
  }

  try {
    // Check if user is a member of the group
    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404);
      throw new Error("Group not found");
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      res.status(403);
      throw new Error("You are not a member of this group");
    }

    const message = await GroupMessage.create({
      sender: req.user._id,
      content: content,
      group: groupId,
    });

    const populatedMessage = await message
      .populate("sender", "name email")
      .populate("group");

    // Update the latest message in the group
    await Group.findByIdAndUpdate(groupId, {
      latestMessage: message._id,
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Get all messages of a group
const getGroupMessages = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  try {
    // Check if user is a member of the group
    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404);
      throw new Error("Group not found");
    }

    const isMember = group.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      res.status(403);
      throw new Error("You are not authorized to view this group's messages");
    }

    const messages = await GroupMessage.find({ group: groupId })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Add member to group (admin only)
const addMemberToGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404);
      throw new Error("Group not found");
    }

    // Check if requester is admin
    if (group.admin.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only admin can add members");
    }

    // Check if user already in group
    const isMember = group.members.some(
      (memberId) => memberId.toString() === userId
    );

    if (isMember) {
      res.status(400);
      throw new Error("User is already a member of this group");
    }

    const updated = await Group.findByIdAndUpdate(
      groupId,
      { $push: { members: userId } },
      { new: true }
    )
      .populate("members", "-password")
      .populate("admin", "-password");

    res.status(200).json(updated);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Remove member from group (admin only)
const removeMemberFromGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404);
      throw new Error("Group not found");
    }

    // Check if requester is admin
    if (group.admin.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only admin can remove members");
    }

    const updated = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: userId } },
      { new: true }
    )
      .populate("members", "-password")
      .populate("admin", "-password");

    res.status(200).json(updated);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// User leave group
const leaveGroup = asyncHandler(async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404);
      throw new Error("Group not found");
    }

    const updated = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: req.user._id } },
      { new: true }
    )
      .populate("members", "-password")
      .populate("admin", "-password");

    res.status(200).json(updated);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = {
  createGroup,
  getGroupsForUser,
  sendGroupMessage,
  getGroupMessages,
  addMemberToGroup,
  removeMemberFromGroup,
  leaveGroup,
};
