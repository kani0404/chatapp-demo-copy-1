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

  if (!chatId || (!content && !file)) {
    console.log("Invalid data passed into request");
    return res.sendStatus(400);
  }

  var newMessage = {
    sender: req.user._id,
    content: content || "",
    chat: chatId,
    status: "sent",
  };

  if (file) {
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

module.exports = { allMessages, sendMessage, updateMessageStatus, markMessageAsRead, deleteMessage };
