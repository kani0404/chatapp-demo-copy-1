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
  // Accept multipart upload via multer (req.file) or legacy base64 in body
  const uploaded = req.file;
  const { content, groupId, file } = req.body;

  if ((!content && !file && !uploaded) || !groupId) {
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

    const msgObj = {
      sender: req.user._id,
      content: content || "",
      group: groupId,
    };

    if (uploaded) {
      const url = `${req.protocol}://${req.get('host')}/uploads/${uploaded.filename}`;
      msgObj.file = {
        originalName: uploaded.originalname,
        mimeType: uploaded.mimetype,
        size: uploaded.size,
        url: url,
      };
    } else if (file) {
      msgObj.file = {
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        base64: file.base64,
      };
    }

    const message = await GroupMessage.create(msgObj);

    // Properly populate the message document
    const populatedMessage = await GroupMessage.findById(message._id)
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

// Delete a group message
const fs = require('fs');
const path = require('path');

const deleteGroupMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    res.status(400);
    throw new Error("Message ID required");
  }

  try {
    const message = await GroupMessage.findById(messageId);

    if (!message) {
      res.status(404);
      throw new Error("Message not found");
    }

    // Only allow deletion by sender
    if (message.sender.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized to delete this message");
    }

    const groupId = message.group;

    // Remove uploaded file if present
    if (message.file && message.file.url) {
      const filePath = path.join(__dirname, '..', message.file.url.replace(`${req.protocol}://${req.get('host')}/`, ''));
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting file from disk:', err);
      });
    }

    await GroupMessage.findByIdAndDelete(messageId);

    // Update group's latestMessage if this was the last message
    const latestMessage = await GroupMessage.findOne({ group: groupId }).sort({ createdAt: -1 });
    await Group.findByIdAndUpdate(groupId, {
      latestMessage: latestMessage ? latestMessage._id : null
    });

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Toggle reaction on a group message
const reactToGroupMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!messageId || !emoji) {
    res.status(400);
    throw new Error('Message ID and emoji are required');
  }

  try {
    const message = await GroupMessage.findById(messageId);
    if (!message) {
      res.status(404);
      throw new Error('Message not found');
    }

    const userId = req.user._id.toString();
    const rIndex = message.reactions.findIndex((r) => r.emoji === emoji);
    if (rIndex === -1) {
      message.reactions.push({ emoji, users: [req.user._id] });
    } else {
      const userIdx = message.reactions[rIndex].users.findIndex((u) => u.toString() === userId);
      if (userIdx === -1) {
        message.reactions[rIndex].users.push(req.user._id);
      } else {
        message.reactions[rIndex].users.splice(userIdx, 1);
        if (message.reactions[rIndex].users.length === 0) {
          message.reactions.splice(rIndex, 1);
        }
      }
    }

    await message.save();

    const populated = await GroupMessage.findById(message._id)
      .populate('sender', 'name email')
      .populate('group');

    // Emit reaction update to the group room so members receive real-time updates
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`group_${populated.group._id}`).emit('message_reaction_updated', populated);
      }
    } catch (emitErr) {
      console.error('Error emitting group reaction update via socket.io:', emitErr);
    }

    res.json(populated);
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
  deleteGroupMessage,
  reactToGroupMessage,
};
