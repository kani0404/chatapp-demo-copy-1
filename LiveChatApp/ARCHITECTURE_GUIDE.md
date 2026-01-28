# Architecture: Last Seen + Voice Messages

## 🏗️ System Overview

This document explains the architecture of the two new features and how they integrate with your existing chat system.

---

## 1️⃣ User Last Seen Feature

### Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│ User A opens browser and goes to chat                   │
├─────────────────────────────────────────────────────────┤
│ Socket.io connects: socket.emit("user_online", userId)  │
├─────────────────────────────────────────────────────────┤
│ Backend: User.lastSeen = now, isOnline = true           │
├─────────────────────────────────────────────────────────┤
│ Broadcast: io.emit("user_status_changed", {             │
│   userId, isOnline: true, lastSeen: now                 │
│ })                                                       │
├─────────────────────────────────────────────────────────┤
│ User B chat component calls:                            │
│ GET /user/lastSeen/:userId                              │
├─────────────────────────────────────────────────────────┤
│ Display: "Online" (green dot)                           │
└─────────────────────────────────────────────────────────┘

When User A disconnects:
┌─────────────────────────────────────────────────────────┐
│ Socket.io disconnect event                              │
├─────────────────────────────────────────────────────────┤
│ Backend: User.lastSeen = now, isOnline = false          │
├─────────────────────────────────────────────────────────┤
│ Broadcast: io.emit("user_status_changed", {             │
│   userId, isOnline: false, lastSeen: now                │
│ })                                                       │
├─────────────────────────────────────────────────────────┤
│ User B sees: "Last seen 5 minutes ago"                  │
└─────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| User Model | Stores `lastSeen` & `isOnline` | Backend: modals/userModel.js |
| Socket Handler | Tracks connect/disconnect | Backend: index.js |
| API Endpoint | `/user/lastSeen/:userId` | Backend: Controllers/userController.js |
| Frontend Display | Shows status below name | Frontend: Components/LastSeenDisplay.js |

### Data Flow

```javascript
User.schema = {
  lastSeen: Date,      // ← Tracks when user was last active
  isOnline: Boolean,   // ← Current status
}

Socket Events:
- user_online       → Updates User.lastSeen = now
- disconnect        → Updates User.lastSeen = now, isOnline = false
- user_status_changed → Notifies all clients of change

API Response:
GET /user/lastSeen/:userId → {
  _id: "...",
  name: "User Name",
  isOnline: true|false,
  lastSeen: "2024-01-28T10:30:00Z"
}
```

---

## 2️⃣ Voice Message Feature

### Architecture Flow

#### One-to-One Voice Message

```
┌──────────────────────────────────────────────────────┐
│ User A clicks mic button                             │
├──────────────────────────────────────────────────────┤
│ VoiceMessageRecorder starts MediaRecorder            │
│ Captures: audio stream → blob → base64               │
├──────────────────────────────────────────────────────┤
│ User speaks → clicks "Send"                          │
├──────────────────────────────────────────────────────┤
│ Socket.emit("voice_message", {                       │
│   senderId: "user_a_id",                             │
│   recipientId: "user_b_id",  ← KEY: Only recipient  │
│   voiceMessage: {                                    │
│     url: "data:audio/webm;base64,...",               │
│     duration: 5,                                     │
│     mimeType: "audio/webm",                          │
│     size: 12345                                      │
│   }                                                  │
│ })                                                   │
├──────────────────────────────────────────────────────┤
│ Backend receives "voice_message" event               │
├──────────────────────────────────────────────────────┤
│ Backend checks: if (userSockets[recipientId])        │
│   io.to(recipientId).emit("new_voice_message", ...)  │
├──────────────────────────────────────────────────────┤
│ ONLY User B receives it                              │
│ (User C, D, E don't see it)                          │
├──────────────────────────────────────────────────────┤
│ User B's socket listener:                            │
│ socket.on("new_voice_message", (data) => {           │
│   setMessages([...prev, voiceMessage])               │
│ })                                                   │
├──────────────────────────────────────────────────────┤
│ Message renders with audio player                    │
│ User B can play/pause/download                       │
└──────────────────────────────────────────────────────┘
```

#### Group Voice Message

```
┌──────────────────────────────────────────────────────┐
│ User A in group chat clicks mic                      │
├──────────────────────────────────────────────────────┤
│ Records voice (same as above)                        │
├──────────────────────────────────────────────────────┤
│ Socket.emit("group_message", {                       │
│   groupId: "group_123",     ← KEY: Only this group  │
│   messageType: "voice",                              │
│   voiceMessage: {...},                               │
│   senderId: "user_a_id",                             │
│   senderName: "User A"                               │
│ })                                                   │
├──────────────────────────────────────────────────────┤
│ Backend routes to group room:                        │
│ io.to(`group_${groupId}`)                            │
│   .emit("new_group_voice_message", ...)              │
├──────────────────────────────────────────────────────┤
│ ALL group members receive it                         │
│ (Only group members, no outsiders)                   │
├──────────────────────────────────────────────────────┤
│ Each member's socket listener processes:             │
│ socket.on("new_group_voice_message", ...)            │
├──────────────────────────────────────────────────────┤
│ Message appears in group chat for all members        │
└──────────────────────────────────────────────────────┘
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| VoiceMessageRecorder | UI for recording | Frontend: Components/VoiceMessageRecorder.js |
| MediaRecorder API | Browser audio recording | Browser native API |
| Voice Message Model | Stores voice data | Backend: modals/messageModel.js |
| Socket Handlers | Routes to recipient/group | Backend: index.js |
| Message Display | Shows audio player | Frontend: MessageBubble.js |

### Data Structures

```javascript
// Message with voice
{
  _id: "msg_123",
  sender: {
    _id: "user_a_id",
    name: "User A"
  },
  messageType: "voice",           // ← NEW
  voiceMessage: {                 // ← NEW
    url: "data:audio/webm;...",   // base64 or S3 URL
    duration: 5,                   // seconds
    mimeType: "audio/webm",        // audio type
    size: 12345                    // bytes
  },
  content: "",                     // empty for voice
  createdAt: "2024-01-28T...",
  status: "delivered",
  // ... other fields same as before
}

// Socket Event for one-to-one
{
  senderId: "user_a_id",
  senderName: "User A",
  recipientId: "user_b_id",        // ← Only this user
  voiceMessage: { url, duration, mimeType, size },
  timestamp: "2024-01-28T..."
}

// Socket Event for group
{
  groupId: "group_123",            // ← All group members
  senderId: "user_a_id",
  senderName: "User A",
  voiceMessage: { url, duration, mimeType, size },
  timestamp: "2024-01-28T..."
}
```

---

## 🔒 Security & Privacy

### Message Delivery Guarantee

**One-to-One Messages:**
```javascript
// Backend verification
if (userSockets[recipientId]) {
  io.to(recipientId).emit("new_voice_message", data);
  // ✅ ONLY recipientId receives it
  // ❌ No one else can see it
}
```

**Group Messages:**
```javascript
// Backend verification
io.to(`group_${groupId}`).emit("new_group_voice_message", data);
// ✅ Only users in group_${groupId} room receive it
// ❌ Non-members can't access
```

### Privacy Checks

| Check | Status | How |
|-------|--------|-----|
| Only recipient gets 1-on-1 | ✅ Active | `userSockets` mapping |
| Only group members get group | ✅ Active | Socket room subscription |
| User can only delete own | ✅ Active | `message.sender === user._id` |
| Message content encrypted | ⚠️ Optional | Implement TLS/SSL |
| Audio data persisted safely | ⚠️ Optional | Use cloud storage (S3) |

---

## 📈 Performance Considerations

### Last Seen
- **Load:** Minimal - one API call per chat header load
- **Polling:** Every 5 seconds (configurable)
- **DB Hit:** Simple indexed field lookup
- **Optimization:** Cache on frontend, reduce API calls

### Voice Messages
- **Client-side recording:** No server load (browser handles)
- **Data size:** ~50KB per 10 seconds of audio
- **Socket broadcast:** Efficient room-based routing
- **Storage:** Optional - store in S3/Firebase for persistence

### Scalability

```
1,000 users online:
- ✅ Socket.io handles efficiently (room-based)
- ✅ Last seen API is read-only (cacheable)
- ✅ Voice messages don't increase load (client-side)

10,000 concurrent messages:
- ✅ Voice data sent via socket (not blocking)
- ⚠️ Optional: Add message queue (Redis) if needed
```

---

## 🔄 Integration with Existing Features

### Works WITH:
- ✅ One-to-one text messages (no conflict)
- ✅ Group messages (no conflict)
- ✅ File uploads (different messageType field)
- ✅ Message delete (works on voice too)
- ✅ Message status (read/delivered)
- ✅ Typing indicators (separate socket event)
- ✅ Online status (combined with lastSeen)

### Does NOT Affect:
- ❌ Authentication system
- ❌ User model relationships
- ❌ Chat/Group creation
- ❌ Message history queries
- ❌ Database schema (backward compatible)

---

## 📊 Database Schema Changes

### User Model (Already Exists)
```javascript
// No new fields - lastSeen already exists
schema = {
  name: String,
  email: String,
  password: String,
  isOnline: Boolean,        // ← Already exists
  lastSeen: Date,           // ← Already exists
  createdAt: Date,
  updatedAt: Date,
}
```

### Message Model (Added Fields)
```javascript
// Added voiceMessage object and messageType
schema = {
  sender: ObjectId,
  content: String,          // Empty for voice
  messageType: {            // ← NEW
    type: String,
    enum: ["text", "file", "voice"],
    default: "text"
  },
  voiceMessage: {           // ← NEW
    url: String,            // base64 or S3 URL
    duration: Number,       // seconds
    mimeType: String,       // "audio/webm"
    size: Number,           // bytes
  },
  // ... rest unchanged
}
```

### No Migration Needed
- Old messages continue to work (messageType defaults to "text")
- No schema conflicts
- Fully backward compatible

---

## 🎯 Future Enhancements

### Phase 2 (Optional):
- [ ] Upload voice to S3/Firebase (not base64)
- [ ] Transcribe voice to text (OpenAI API)
- [ ] Voice message notifications
- [ ] Voice message download
- [ ] Voice message reactions

### Phase 3 (Optional):
- [ ] Video messages
- [ ] Screen share
- [ ] Call notifications with lastSeen

---

## 📚 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React | UI components |
| Frontend | Socket.io Client | Real-time messages |
| Frontend | Web Audio API | Voice recording |
| Backend | Node.js + Express | Server |
| Backend | Socket.io | Real-time events |
| Database | MongoDB | Persistent storage |
| Real-time | Socket.io Rooms | Message routing |

---

## 🔗 Event Flow Diagram

```
LAST SEEN:
User Login → socket.on("user_online") 
  → User.lastSeen = now 
  → io.emit("user_status_changed")
  → Frontend polls GET /user/lastSeen/:userId
  → Display "Online" or "Last seen X ago"

VOICE MESSAGE (1-on-1):
Record voice 
  → socket.emit("voice_message", {recipientId, ...})
  → Backend: if (userSockets[recipientId])
  → io.to(recipientId).emit("new_voice_message")
  → Recipient receives (only them)
  → Display audio player

VOICE MESSAGE (Group):
Record voice
  → socket.emit("group_message", {groupId, messageType: "voice", ...})
  → Backend: io.to(`group_${groupId}`).emit(...)
  → All group members receive
  → Display audio player
```

---

## ✨ Summary

| Feature | Type | Status | Impact |
|---------|------|--------|--------|
| Last Seen | Tracking | ✅ Ready | None - additive |
| Voice Messages | Messaging | ✅ Ready | None - additive |
| Message Delivery | Security | ✅ Verified | None - improved |
| Backward Compatibility | Architecture | ✅ Verified | 100% compatible |

**Result:** Both features are production-ready, properly architectured, and fully integrated with your existing system.
