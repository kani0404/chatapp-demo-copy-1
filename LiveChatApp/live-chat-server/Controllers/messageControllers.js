const expressAsyncHandler = require("express-async-handler");
const Message = require("../modals/messageModel");
const User = require("../modals/userModel");
const Chat = require("../modals/chatModel");

const allMessages = expressAsyncHandler(async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name email")
      .populate("reciever")
      .populate("chat");
    res.json(messages);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

const sendMessage = expressAsyncHandler(async (req, res) => {
  const { content, chatId, file } = req.body;

  // Support multipart file via multer as req.file
  const uploaded = req.file;

  if (!chatId || (!content && !file && !uploaded)) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content || "",
    chat: chatId,
    status: "sent",
  };

  if (uploaded) {
    // Build accessible URL
    const url = `${req.protocol}://${req.get('host')}/uploads/${uploaded.filename}`;
    newMessage.file = {
      originalName: uploaded.originalname,
      mimeType: uploaded.mimetype,
      size: uploaded.size,
      url: url,
    };
  } else if (file) {
    // Backwards-compatible base64 support
    newMessage.file = {
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      base64: file.base64,
    };
  }

  try {
    var message = await Message.create(newMessage);

    console.log(message);
    message = await message.populate("sender", "name pic");
    message = await message.populate("chat");
    message = await message.populate("reciever");
    message = await User.populate(message, {
      path: "chat.users",
      select: "name email",
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });
    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Update message status
const fs = require('fs');
const path = require('path');

const updateMessageStatus = expressAsyncHandler(async (req, res) => {
  const { messageId, status } = req.body;

  if (!messageId || !status) {
    return res.status(400).json({ message: "Message ID and status required" });
  }

  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      { status: status },
      { new: true }
    );
    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Toggle reaction on a message
const reactToMessage = expressAsyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  if (!messageId || !emoji) {
    res.status(400);
    throw new Error('Message ID and emoji are required');
  }

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      res.status(404);
      throw new Error('Message not found');
    }

    const userId = req.user._id.toString();
    // find reaction entry
    const rIndex = message.reactions.findIndex((r) => r.emoji === emoji);
    if (rIndex === -1) {
      // add new reaction
      message.reactions.push({ emoji, users: [req.user._id] });
    } else {
      const userIdx = message.reactions[rIndex].users.findIndex((u) => u.toString() === userId);
      if (userIdx === -1) {
        message.reactions[rIndex].users.push(req.user._id);
      } else {
        // remove user's reaction
        message.reactions[rIndex].users.splice(userIdx, 1);
        // if no users left for this emoji, remove the reaction entry
        if (message.reactions[rIndex].users.length === 0) {
          message.reactions.splice(rIndex, 1);
        }
      }
    }

    await message.save();

    // populate necessary fields
    const populated = await Message.findById(message._id)
      .populate('sender', 'name pic')
      .populate('reciever')
      .populate('chat');

    // Emit reaction update over socket.io so connected clients receive it in real-time
    try {
      const io = req.app.get('io');
      if (io) {
        if (populated.chat && populated.chat.isGroupChat) {
          // For group chats, emit to the group room
          io.to(`group_${populated.chat._id}`).emit('message_reaction_updated', populated);
        } else {
          // For private chats, emit to both sender and receiver rooms
          if (populated.sender && populated.sender._id) io.to(populated.sender._id.toString()).emit('message_reaction_updated', populated);
          if (populated.reciever && populated.reciever._id) io.to(populated.reciever._id.toString()).emit('message_reaction_updated', populated);
        }
      }
    } catch (emitErr) {
      console.error('Error emitting reaction update via socket.io:', emitErr);
    }

    res.json(populated);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Mark message as read
const markMessageAsRead = expressAsyncHandler(async (req, res) => {
  const { messageId } = req.body;

  if (!messageId) {
    return res.status(400).json({ message: "Message ID required" });
  }

  try {
    const message = await Message.findByIdAndUpdate(
      messageId,
      { 
        status: "read",
        $addToSet: { readBy: req.user._id }
      },
      { new: true }
    );
    res.json(message);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// Delete message
const deleteMessage = expressAsyncHandler(async (req, res) => {
  const { messageId } = req.params;

  if (!messageId) {
    return res.status(400).json({ message: "Message ID required" });
  }

  try {
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Only allow deletion by sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    const chatId = message.chat;

    // Remove uploaded file if present
    if (message.file && message.file.url) {
      const filePath = path.join(__dirname, '..', message.file.url.replace(`${req.protocol}://${req.get('host')}/`, ''));
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error deleting file from disk:', err);
      });
    }

    await Message.findByIdAndDelete(messageId);

    // Update chat's latestMessage if this was the last message
    const latestMessage = await Message.findOne({ chat: chatId }).sort({ createdAt: -1 });
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: latestMessage ? latestMessage._id : null
    });

    res.json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

module.exports = { allMessages, sendMessage, updateMessageStatus, markMessageAsRead, deleteMessage, reactToMessage };
