const express = require("express");
const dotenv = require("dotenv");
const { default: mongoose } = require("mongoose");
const cors = require("cors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const http = require("http");
const socketIo = require("socket.io");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

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
const userSockets = {}; // Map userId to socketId

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // User online - store socket mapping
  socket.on("user_online", (userId) => {
    socket.join(userId);
    userSockets[userId] = socket.id;
    console.log(`User ${userId} is online`);
    
    // Broadcast user online status to all connected clients
    io.emit("user_status_changed", { userId, isOnline: true });
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

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    // Find and remove user from userSockets
    for (let userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        // Broadcast user offline status
        io.emit("user_status_changed", { userId, isOnline: false });
        break;
      }
    }
  });
});

// Error Handling middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, console.log("Server is Running..."));

module.exports = { app, io };
