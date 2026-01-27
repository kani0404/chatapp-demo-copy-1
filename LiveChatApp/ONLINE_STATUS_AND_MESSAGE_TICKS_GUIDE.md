# Online Status & WhatsApp-style Message Ticks Implementation Guide

## Overview
This guide documents the implementation of:
1. **Online/Offline Status** - Users appear online only when logged in, offline otherwise
2. **WhatsApp-style Message Ticks** - Single tick (sent), double tick (delivered), purple double tick (read)

---

## Backend Changes

### 1. **Database Models Updated**

#### `userModel.js` - Added Fields
```javascript
{
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
}
```

#### `messageModel.js` - Added Fields
```javascript
{
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
  },
  groupMessage: {
    type: Boolean,
    default: false,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
  },
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
}
```

### 2. **Socket.io Events (index.js)**

**New Events Implemented:**

#### User Status Events
```javascript
// Emit when user comes online
socket.on("user_online", (userId) => {
  userSockets[userId] = socket.id;
  io.emit("user_status_changed", { userId, isOnline: true });
});

// Emit when user goes offline
socket.on("disconnect", () => {
  // Broadcast offline status to all users
  io.emit("user_status_changed", { userId, isOnline: false });
});
```

#### Message Status Events
```javascript
// Message delivered (sent to receiver)
socket.on("message_delivered", (data) => {
  io.to(data.receiverId).emit("message_delivered", { messageId: data.messageId, status: "delivered" });
  io.to(data.senderId).emit("message_delivered", { messageId: data.messageId, status: "delivered" });
});

// Message read (receiver opened/read message)
socket.on("message_read", (data) => {
  io.to(data.senderId).emit("message_read", { messageId: data.messageId, status: "read" });
});

// Group message read status
socket.on("group_message_read", (data) => {
  io.to(`group_${data.groupId}`).emit("group_message_read", { 
    messageId: data.messageId, 
    userId: data.userId, 
    status: "read" 
  });
});
```

### 3. **User Controller (userController.js)**

#### Login Controller - Updated
```javascript
// Now updates user's online status
await UserModel.findByIdAndUpdate(user._id, { 
  isOnline: true, 
  lastSeen: new Date() 
});
```

#### New Logout Controller
```javascript
const logoutController = async (req, res) => {
  await UserModel.findByIdAndUpdate(req.user._id, { 
    isOnline: false, 
    lastSeen: new Date() 
  });
  res.status(200).json({ message: "Logged out successfully" });
};
```

### 4. **Message Controller (messageControllers.js)**

#### New Endpoints

**Update Message Status**
```javascript
const updateMessageStatus = async (req, res) => {
  const { messageId, status } = req.body;
  const message = await Message.findByIdAndUpdate(messageId, { status });
  res.json(message);
};
```

**Mark Message as Read**
```javascript
const markMessageAsRead = async (req, res) => {
  const message = await Message.findByIdAndUpdate(
    messageId,
    { 
      status: "read",
      $addToSet: { readBy: req.user._id }
    }
  );
  res.json(message);
};
```

### 5. **Routes Updates**

#### Message Routes (messageRoutes.js)
```javascript
router.route("/status/update").post(protect, updateMessageStatus);
router.route("/read/mark").post(protect, markMessageAsRead);
```

#### User Routes (userRoutes.js)
```javascript
Router.post("/logout", protect, logoutController);
```

---

## Frontend Changes

### 1. **Components Updated**

#### **Users.js** - Display Online Status
- Shows green/gray indicator based on `user.isOnline` field
- Display "Online" (green) or "Offline" (gray) text next to username
- Uses color: `#10b981` for online, `#9ca3af` for offline

```javascript
// Online indicator dot
<div style={{
  backgroundColor: user.isOnline ? "#10b981" : "#9ca3af",
  // ...
}} />
```

#### **MessageSelf.js** - Message Ticks
Added `MessageTicks` component that displays:
- ✓ (single tick) for "sent" status - cyan color
- ✓✓ (double tick) for "delivered" status - cyan color
- ✓✓ (double tick) for "read" status - purple/magenta color (bold)

```javascript
const MessageTicks = ({ status }) => {
  if (status === "sent") return <span>✓</span>;
  if (status === "delivered") return <span>✓✓</span>;
  if (status === "read") return <span style={{ color: "#a855f7" }}>✓✓</span>;
};
```

#### **MessageOthers.js** - Dark Theme Update
- Updated colors to match dark elegant theme
- Avatar gradient: `#6366f1` to `#8b5cf6` (purple-blue)
- Message bubble: Semi-transparent indigo background
- Sender name color: Cyan (`#06b6d4`)

#### **ChatArea.js** - Socket Listeners
Added socket listeners to handle:
- `message_delivered` - Update message status to "delivered"
- `message_read` - Update message status to "read"
- `user_status_changed` - Track user online/offline changes

```javascript
socket.on("message_delivered", (data) => {
  setAllMessages(prev => 
    prev.map(msg => 
      msg._id === data.messageId ? {...msg, status: "delivered"} : msg
    )
  );
});

socket.on("message_read", (data) => {
  setAllMessages(prev => 
    prev.map(msg => 
      msg._id === data.messageId ? {...msg, status: "read"} : msg
    )
  );
});
```

#### **Sidebar.js** - User Online Status
- Emit `user_online` event when user logs in
- Handle logout properly by calling `/user/logout` API
- Remove socket connection on logout

```javascript
useEffect(() => {
  const socket = io("http://localhost:8080", {
    query: { userId: user._id },
  });
  socket.emit("user_online", user._id);
  return () => socket.disconnect();
}, [user._id]);
```

---

## How It Works

### **Online Status Flow**
1. User logs in → `loginController` updates `isOnline: true` in database
2. User session → `socket.emit("user_online", userId)` 
3. Server broadcasts → `io.emit("user_status_changed", { userId, isOnline: true })`
4. Other users see green "Online" indicator
5. User logs out → `logoutController` updates `isOnline: false`
6. User disconnects → Server emits `user_status_changed` with `isOnline: false`
7. Other users see gray "Offline" indicator

### **Message Ticks Flow**
1. **Sent** (✓)
   - Message created with `status: "sent"`
   - Displayed in MessageSelf component with cyan tick
   
2. **Delivered** (✓✓)
   - Receiver opens chat
   - Frontend calls `/message/status/update` with `status: "delivered"`
   - Socket event `message_delivered` broadcasts to sender
   - Sender's message updates to show double tick (cyan)
   
3. **Read** (✓✓ purple)
   - Receiver scrolls message into view OR after 2 seconds
   - Frontend calls `/message/read/mark`
   - Socket event `message_read` broadcasts to sender
   - Sender's message updates to show double tick (purple/bold)
   - Message added to `readBy` array in database

---

## API Endpoints

### User Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/user/login` | Login & set `isOnline: true` |
| POST | `/user/logout` | Logout & set `isOnline: false` |
| GET | `/user/fetchUsers` | Get all users with `isOnline` status |

### Message Endpoints
| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/message/status/update` | `{ messageId, status }` |
| POST | `/message/read/mark` | `{ messageId }` |

---

## Socket Events

### Client → Server
- `user_online` - Emit userId when user logs in
- `message_delivered` - Send when message is received
- `message_read` - Send when message is read
- `group_message_read` - Send for group messages
- `user_typing` - Send when user starts typing
- `user_stop_typing` - Send when user stops typing

### Server → Client
- `user_status_changed` - Broadcast user online/offline status
- `message_delivered` - Update message to "delivered"
- `message_read` - Update message to "read"
- `group_message_read` - Update group message read status
- `user_typing` - Notify of user typing
- `user_stop_typing` - Notify user stopped typing

---

## Color Scheme (Dark Theme)

| Element | Color | Usage |
|---------|-------|-------|
| Online Indicator | `#10b981` | Green dot for online users |
| Offline Indicator | `#9ca3af` | Gray dot for offline users |
| Message Tick (Sent) | `#06b6d4` | Cyan single tick |
| Message Tick (Delivered) | `#06b6d4` | Cyan double tick |
| Message Tick (Read) | `#a855f7` | Purple/bold double tick |
| Avatar Gradient | `#6366f1` → `#8b5cf6` | Purple-blue gradient |

---

## Testing Checklist

- [ ] Login → User shows as online (green indicator)
- [ ] Open "Available Users" → See online status of all users
- [ ] Send message → See single tick (✓)
- [ ] Receiver opens chat → Tick becomes double (✓✓) cyan
- [ ] Receiver reads message → Tick becomes double (✓✓) purple
- [ ] Logout → User shows as offline (gray indicator)
- [ ] Refresh Users → Online status updates correctly
- [ ] Group chat → See status ticks on group messages
- [ ] Multiple users → Status updates in real-time across all users

---

## Notes

- Online status updates in real-time via Socket.io
- Message ticks are visual indicators, actual read/delivered logic can be enhanced
- `readBy` array tracks which users have read a message (useful for group chats)
- `lastSeen` timestamp can be used to show "Last seen at 2:30 PM"
- All date fields use MongoDB timestamps automatically

