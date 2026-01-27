# Online Status & Message Ticks - System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    LIVE CHAT APP ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐              ┌──────────────────┐
│   Browser 1      │              │   Browser 2      │
│   (User A)       │              │   (User B)       │
│                  │              │                  │
│  ┌────────────┐  │              │  ┌────────────┐  │
│  │ React App  │◄─┼─Socket.io────┼─►│ React App  │  │
│  └────────────┘  │              │  └────────────┘  │
│                  │              │                  │
│  Users.js        │              │  Users.js        │
│  ChatArea.js     │              │  ChatArea.js     │
│  MessageSelf.js  │              │  MessageOthers.js│
│  MessageOthers.js│              │  MessageSelf.js  │
└──────────────────┘              └──────────────────┘
         ▲                                ▲
         │                                │
         └────────────┬───────────────────┘
                      │
                      │ HTTP REST API + WebSocket
                      │
            ┌─────────▼──────────┐
            │   Node.js Server   │
            │   (Port 8080)      │
            │                    │
            │  ┌──────────────┐  │
            │  │  Express.js  │  │
            │  └──────────────┘  │
            │  ┌──────────────┐  │
            │  │  Socket.io   │  │
            │  └──────────────┘  │
            │                    │
            │  Controllers:      │
            │  - userController  │
            │  - messageCtrl     │
            │  - groupCtrl       │
            └─────────┬──────────┘
                      │
            ┌─────────▼──────────┐
            │    MongoDB        │
            │                   │
            │  Collections:     │
            │  - users          │
            │  - messages       │
            │  - chats          │
            │  - groups         │
            └───────────────────┘
```

---

## Online Status Flow

```
LOGIN FLOW:
──────────

User clicks Login
        │
        ▼
POST /user/login
        │
        ├─► Check credentials
        │
        ├─► Update DB: isOnline = true
        │
        └─► Return JWT token
                │
                ▼
        Client stores token in localStorage
                │
                ▼
        emit("user_online", userId)
                │
                ▼
        Server broadcasts:
        io.emit("user_status_changed", { userId, isOnline: true })
                │
                ▼
        All connected clients receive update
                │
                ▼
        User appears as 🟢 ONLINE in:
        - Available Users list
        - Chat conversations
        - User profiles


LOGOUT FLOW:
───────────

User clicks Logout
        │
        ▼
POST /user/logout
        │
        ├─► Update DB: isOnline = false
        │
        └─► Return success
                │
                ▼
        Client removes token from localStorage
                │
                ▼
        socket.disconnect()
                │
                ▼
        Server detects disconnect
                │
                ▼
        Server broadcasts:
        io.emit("user_status_changed", { userId, isOnline: false })
                │
                ▼
        All connected clients receive update
                │
                ▼
        User appears as ⚪ OFFLINE in all lists
```

---

## Message Status Flow

```
SENDING MESSAGE:
────────────────

User A types "Hello" and sends
        │
        ▼
POST /message (with content)
        │
        ├─► Create message with status: "sent"
        │
        ├─► Save to MongoDB
        │
        └─► Return message object
                │
                ▼
        Frontend displays: ✓ (cyan tick)
                │
                ▼
        Message persists in DB


DELIVERING MESSAGE:
──────────────────

User B opens chat with User A
        │
        ▼
Client receives all messages
        │
        ├─► Render messages
        │
        └─► Update each message:
                │
                ▼
            emit("message_delivered", {
                messageId,
                receiverId,
                senderId
            })
                │
                ▼
        Server broadcasts to sender:
        io.to(senderId).emit("message_delivered", {
            messageId,
            status: "delivered"
        })
                │
                ▼
        Sender's Frontend receives update
                │
                ▼
        Update state: message.status = "delivered"
                │
                ▼
        Re-render message with: ✓✓ (cyan ticks)


READING MESSAGE:
────────────────

User B scrolls and reads message (2+ seconds visible)
        │
        ▼
POST /message/read/mark (messageId)
        │
        ├─► Update DB: status = "read"
        │
        ├─► Add userId to readBy array
        │
        └─► Return updated message
                │
                ▼
        emit("message_read", {
            messageId,
            userId,
            senderId
        })
                │
                ▼
        Server broadcasts to sender:
        io.to(senderId).emit("message_read", {
            messageId,
            status: "read"
        })
                │
                ▼
        Sender's Frontend receives update
                │
                ▼
        Update state: message.status = "read"
                │
                ▼
        Re-render message with: ✓✓ (purple ticks)
```

---

## Database Schema

```
USER COLLECTION:
════════════════

{
  _id: ObjectId,
  name: String,           // "John Doe"
  email: String,          // "john@example.com"
  password: String,       // bcrypt hashed
  isOnline: Boolean,      // ← NEW: true/false
  lastSeen: Date,         // ← NEW: timestamp
  createdAt: Date,
  updatedAt: Date
}

✅ isOnline updates on login/logout
✅ lastSeen updates on login/logout
✅ Used to show 🟢 Online or ⚪ Offline


MESSAGE COLLECTION:
═══════════════════

{
  _id: ObjectId,
  sender: ObjectId,       // User who sent
  content: String,        // "Hello!"
  reciever: ObjectId,     // User receiving (1-to-1)
  chat: ObjectId,         // Chat room ID
  file: {                 // Optional file attachment
    originalName: String,
    mimeType: String,
    size: Number,
    base64: String
  },
  status: String,         // ← NEW: "sent" | "delivered" | "read"
  groupMessage: Boolean,  // ← NEW: true if in group
  group: ObjectId,        // ← NEW: Group ID if group message
  readBy: [ObjectId],     // ← NEW: Array of users who read
  createdAt: Date,
  updatedAt: Date
}

✅ status: "sent" → shows ✓ (cyan)
✅ status: "delivered" → shows ✓✓ (cyan)
✅ status: "read" → shows ✓✓ (purple)
✅ readBy: tracks who read in group chats
```

---

## Socket Events Lifecycle

```
CONNECTION ESTABLISHED:
───────────────────────

Client connects to Socket.io
        │
        ▼
Server: "New user connected"
        │
        ▼
Client: emit("user_online", userId)
        │
        ▼
Server: socket.on("user_online")
        │
        ├─► Store socket mapping: userSockets[userId] = socketId
        │
        └─► Broadcast: io.emit("user_status_changed", {userId, isOnline:true})
                │
                ▼
        All clients: socket.on("user_status_changed")
                │
                ▼
        Update local state → Re-render Users list


MESSAGE LIFECYCLE:
──────────────────

1. MESSAGE SENT (status: "sent")
   └─ Frontend: show ✓ (cyan) immediately
   └─ Backend: saves to DB with status: "sent"

2. MESSAGE DELIVERED (status: "delivered")
   └─ Recipient opens chat or loads messages
   └─ emit("message_delivered", {messageId, receiverId})
   └─ Server broadcasts to sender
   └─ Sender receives "message_delivered" event
   └─ Frontend: update to ✓✓ (cyan)

3. MESSAGE READ (status: "read")
   └─ Recipient scrolls message into view (2+ seconds)
   └─ emit("message_read", {messageId, userId})
   └─ Server: update DB status = "read" + add to readBy[]
   └─ Server broadcasts to sender
   └─ Sender receives "message_read" event
   └─ Frontend: update to ✓✓ (purple)


DISCONNECTION:
──────────────

Client closes browser/loses connection
        │
        ▼
Socket: "disconnect" event triggered
        │
        ▼
Server: socket.on("disconnect")
        │
        ├─► Find userId in userSockets
        │
        ├─► Delete socket mapping
        │
        ├─► Update DB: isOnline = false
        │
        └─► Broadcast: io.emit("user_status_changed", {userId, isOnline:false})
                │
                ▼
        All clients: socket.on("user_status_changed")
                │
                ▼
        Update state → Re-render user as ⚪ OFFLINE
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────┐
│              App Component Structure                │
└─────────────────────────────────────────────────────┘

            Main Container (with Socket)
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    Sidebar        ChatArea      Users/Groups
        │             │             │
    ┌───┴────┐    ┌───┴────┐  ┌────┴────┐
    │         │    │        │  │         │
Conversations  │Messages   │  │ Online  │
   (list)      │Container │  │ Status  │
    │          │        │  │  (dots)   │
    │      ┌───┴─┐  ┌──┴──┐ │         │
    │      │     │  │     │ │         │
    │   MessageSelf MessageOthers    │
    │   (sent ticks) (received)      │
    │      │     │  │     │ │         │
    │      └──┬──┘  └──┬──┘ │         │
    │         │        │    │         │
    │    (✓ cyan)  (⚪ gray)│    (🟢 green)
    │  (✓✓ purple)  (text)  │    (text)
    │                       │
    └───────────┬───────────┘
                │
            Socket.io
                │
        (user_online, message_delivered,
         message_read, user_status_changed)


USER STATUS DISPLAY:
════════════════════

Users.js Component:
┌──────────────────────────────────────────┐
│  User Item Rendering:                    │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  Avatar: {user.name[0]}          │   │
│  │  ┌──────────────────────────────┐│   │
│  │  │ ●  ← Online indicator dot    ││   │
│  │  │                              ││   │
│  │  │ user.isOnline:               ││   │
│  │  │   true  → #10b981 (green)    ││   │
│  │  │   false → #9ca3af (gray)     ││   │
│  │  └──────────────────────────────┘│   │
│  │                                  │   │
│  │  Name: {user.name}               │   │
│  │                                  │   │
│  │  Status: {user.isOnline}         │   │
│  │    ? "Online" : "Offline"        │   │
│  └──────────────────────────────────┘   │
└──────────────────────────────────────────┘


MESSAGE TICKS DISPLAY:
══════════════════════

MessageSelf Component:
┌────────────────────────────────────┐
│  Message: "Hello!"✓ (cyan tick)   │
│                                    │
│  Status: "sent"                    │
│  └─ Displays: ✓                    │
│     Color: #06b6d4 (cyan)          │
│     Meaning: Message sent to server│
│                                    │
│  Status: "delivered"               │
│  └─ Displays: ✓✓                   │
│     Color: #06b6d4 (cyan)          │
│     Meaning: Received by client    │
│                                    │
│  Status: "read"                    │
│  └─ Displays: ✓✓                   │
│     Color: #a855f7 (purple)        │
│     FontWeight: bold               │
│     Meaning: Message read by user  │
└────────────────────────────────────┘
```

---

## Real-time Update Sequence

```
TIME    CLIENT 1          SERVER           CLIENT 2
────────────────────────────────────────────────────

T0:     Login             Update DB        
        emit("user_online", userId)     
                          ✓
                          │
                          broadcast
                          "user_status_changed"
                          │
                          ├────────────────────► Receive update
                                                 Show: 🟢 Online

T1:     Send message      Save to DB       
        show: ✓           status: "sent"
                          │
                          ✓

T2:                                        Open chat
                                           emit("message_delivered")
                          ◄────────────────
                          
                          Update: status="delivered"
                          broadcast
                          │
        ◄─────────────────
        Receive update
        show: ✓✓ (cyan)

T3:                                        Read message
                                           (2+ seconds visible)
                                           emit("message_read")
                          ◄────────────────
                          
                          Update DB
                          status: "read"
                          add to readBy[]
                          broadcast
                          │
        ◄─────────────────
        Receive update
        show: ✓✓ (purple)
```

---

**Architecture Version**: 1.0  
**Last Updated**: January 27, 2026
