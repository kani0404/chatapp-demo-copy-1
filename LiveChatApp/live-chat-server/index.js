const express = require("express");
const dotenv = require("dotenv");
const { default: mongoose } = require("mongoose");
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

dotenv.config();

const app = express();
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

// Make io available through the express app so controllers can emit events without circular requires
app.set('io', io);

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json());

const userRoutes = require("./Routes/userRoutes");
const chatRoutes = require("./Routes/chatRoutes");
const messageRoutes = require("./Routes/messageRoutes");
const groupRoutes = require("./Routes/groupRoutes");

const connectDb = async () => {
  try {
    const connect = await mongoose.connect(process.env.MONGO_URI);
    console.log("Server is Connected to Database");
  } catch (err) {
    console.log("Server is NOT connected to Database", err.message);
  }
};
connectDb();

app.get("/", (req, res) => {
  res.send("API is running123");
});

app.use("/user", userRoutes);
app.use("/chat", chatRoutes);
app.use("/message", messageRoutes);
app.use("/group", groupRoutes);

// Socket.io setup
// Map userId -> Set(socketId) to support multiple tabs/devices per user
const userSockets = {};
const UserModel = require('./modals/userModel');

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // Send current online users list to the newly connected socket so it can initialize state
  try {
    const onlineIds = Object.keys(userSockets || {});
    socket.emit('current_online_users', { userIds: onlineIds });
  } catch (err) {
    console.error('Error emitting current online users:', err);
  }

  // User online - store socket mapping
  socket.on("user_online", async (userId) => {
    try {
      socket.join(userId);
      if (!userSockets[userId]) userSockets[userId] = new Set();
      userSockets[userId].add(socket.id);
      console.log(`User ${userId} is online (socket ${socket.id})`);

      // Persist online status in DB if first connection
      if (userSockets[userId].size === 1) {
        await UserModel.findByIdAndUpdate(userId, { isOnline: true });
        io.emit("user_status_changed", { userId, isOnline: true });
      }
    } catch (err) {
      console.error('Error handling user_online:', err);
    }
  });

  // Join group
  socket.on("join_group", (groupId) => {
    socket.join(`group_${groupId}`);
    console.log(`User joined group: ${groupId}`);
  });

  // Leave group
  socket.on("leave_group", (groupId) => {
    socket.leave(`group_${groupId}`);
    console.log(`User left group: ${groupId}`);
  });

  // Group message - broadcast to all in group room
  socket.on("group_message", (data) => {
    io.to(`group_${data.groupId}`).emit("new_group_message", {
      groupId: data.groupId,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      timestamp: data.timestamp,
      status: "sent",
    });
  });

  // Mark message as delivered
  socket.on("message_delivered", (data) => {
    const { messageId, receiverId, senderId } = data;
    if (userSockets[receiverId]) {
      io.to(receiverId).emit("message_delivered", { messageId, status: "delivered" });
    }
    if (userSockets[senderId]) {
      io.to(senderId).emit("message_delivered", { messageId, status: "delivered" });
    }
  });

  // Mark message as read
  socket.on("message_read", (data) => {
    const { messageId, receiverId, senderId } = data;
    if (userSockets[senderId]) {
      io.to(senderId).emit("message_read", { messageId, status: "read" });
    }
  });

  // Group message read
  socket.on("group_message_read", (data) => {
    const { messageId, groupId, userId } = data;
    io.to(`group_${groupId}`).emit("group_message_read", { messageId, userId, status: "read" });
  });

  // Typing indicator
  socket.on("user_typing", (data) => {
    const { receiverId, senderName, senderId } = data;
    if (userSockets[receiverId]) {
      io.to(receiverId).emit("user_typing", { senderName, senderId });
    }
  });

  // Stop typing indicator
  socket.on("user_stop_typing", (data) => {
    const { receiverId, senderId } = data;
    if (userSockets[receiverId]) {
      io.to(receiverId).emit("user_stop_typing", { senderId });
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
    try {
      // Find userId(s) that have this socket and remove it
      for (let userId in userSockets) {
        if (userSockets[userId].has(socket.id)) {
          userSockets[userId].delete(socket.id);
          // If no more sockets for this user, mark offline and notify
          if (userSockets[userId].size === 0) {
            delete userSockets[userId];
            await UserModel.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
            io.emit('user_status_changed', { userId, isOnline: false, lastSeen: new Date() });
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error handling disconnect:', err);
    }
  });
});

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, console.log("Server is Running..."));

module.exports = { app, io };
