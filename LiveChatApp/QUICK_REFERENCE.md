# Quick Reference: Online Status & Message Ticks

## What Changed?

### 👤 **Online Status**
- Users show as **🟢 Online** (green) when logged in
- Users show as **⚪ Offline** (gray) when logged out
- Updates in real-time for all users

### ✅ **Message Ticks**
| Tick | Meaning | Color |
|------|---------|-------|
| ✓ | Sent to server | Cyan |
| ✓✓ | Delivered to recipient | Cyan |
| ✓✓ | Read by recipient | Purple |

---

## How to Test

### Test 1: Online Status
1. Open browser 1, login as "User A"
2. Open browser 2, login as "User B"
3. In browser 1, click "Available Users"
4. See "User B - 🟢 Online" 
5. In browser 2, logout
6. In browser 1, refresh "Available Users"
7. See "User B - ⚪ Offline"

### Test 2: Message Ticks
1. Both users logged in
2. User A opens chat with User B
3. User A sends message "Hello"
4. Message shows ✓ (cyan)
5. User B opens chat
6. Message shows ✓✓ (cyan) for User A
7. After 2 seconds, shows ✓✓ (purple) = read

### Test 3: Group Messages
1. Create a group with 3 users
2. Send message in group
3. Each user will see tick status update
4. When all users read, shows ✓✓ (purple)

---

## Database Fields Added

### User Collection
```javascript
{
  name: "John",
  email: "john@example.com",
  isOnline: true,        // ← NEW
  lastSeen: "2026-01-27", // ← NEW
}
```

### Message Collection
```javascript
{
  content: "Hello!",
  sender: ObjectId,
  status: "read",        // ← NEW (sent/delivered/read)
  readBy: [ObjectId],    // ← NEW (who read this message)
}
```

---

## Code Examples

### Show Online Status (React)
```jsx
<span style={{ color: user.isOnline ? "#10b981" : "#9ca3af" }}>
  {user.isOnline ? "🟢 Online" : "⚪ Offline"}
</span>
```

### Display Message Ticks (React)
```jsx
const getTick = (status) => {
  if (status === "sent") return "✓";
  if (status === "delivered") return "✓✓";
  if (status === "read") return "✓✓"; // purple color
};
```

### Emit User Online (Socket.io)
```javascript
const socket = io("http://localhost:8080");
socket.emit("user_online", userId);
```

### Listen for Status Changes (Socket.io)
```javascript
socket.on("user_status_changed", (data) => {
  console.log(data.userId, "is", data.isOnline ? "online" : "offline");
});

socket.on("message_read", (data) => {
  updateMessageStatus(data.messageId, "read");
});
```

---

## API Calls

### Login (Get Online)
```bash
POST /user/login
Body: { name, password }
Response: { isOnline: true, ... }
```

### Logout (Go Offline)
```bash
POST /user/logout
Headers: { Authorization: "Bearer token" }
```

### Get All Users
```bash
GET /user/fetchUsers
Headers: { Authorization: "Bearer token" }
Response: [{ name, email, isOnline, ... }]
```

### Update Message Status
```bash
POST /message/status/update
Body: { messageId, status: "delivered" }
```

### Mark Message Read
```bash
POST /message/read/mark
Body: { messageId }
```

---

## Color Reference

- Online (green): `#10b981`
- Offline (gray): `#9ca3af`
- Sent tick (cyan): `#06b6d4`
- Read tick (purple): `#a855f7`

---

## Troubleshooting

**Q: Users not showing as online?**
- A: Make sure `/user/logout` API is called when logging out
- Check that socket connection is established

**Q: Message ticks not updating?**
- A: Verify socket listeners are working
- Check browser console for errors
- Ensure server is running

**Q: Offline status stays after login?**
- A: Clear browser cache/cookies
- Check MongoDB to see if `isOnline` is updated
- Restart server

---

## Future Enhancements

- [ ] Show "Last seen" time (e.g., "Last seen at 2:30 PM")
- [ ] Show "Typing..." indicator
- [ ] Show profile pictures instead of initials
- [ ] Block/Mute users
- [ ] Read receipts for groups (show who read)
- [ ] Message reactions (👍 😂 ❤️)

---

**Version**: 1.0  
**Date**: January 27, 2026  
**Status**: ✅ Complete & Tested
