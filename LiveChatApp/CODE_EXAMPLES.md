# Code Integration Examples: Step-by-Step Implementation

## 🎯 Real Implementation Examples

Use these exact code snippets for your specific chat components.

---

## 📁 Example 1: One-to-One Chat Component (ChatArea.js)

### Add Imports
```javascript
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import io from "socket.io-client";
import LastSeenDisplay from "./LastSeenDisplay";
import VoiceMessageRecorder from "./VoiceMessageRecorder";
// ... other imports
```

### In Your Component State (Add These)
```javascript
function ChatArea() {
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [socket, setSocket] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  
  // Get user data
  const userData = JSON.parse(localStorage.getItem("userData"));
  const user = userData?.data;
  
  // Get other user ID from route params
  const { chatId, userName } = useParams(); // or however you get it
```

### Add Socket Listeners (useEffect)
```javascript
useEffect(() => {
  if (!socket) return;

  // Listen for voice messages
  socket.on("new_voice_message", (data) => {
    if (data.senderId !== user._id) { // Only add if from other user
      const voiceMessage = {
        _id: data.messageId || Date.now(),
        sender: {
          _id: data.senderId,
          name: data.senderName
        },
        content: "",
        messageType: "voice",
        voiceMessage: {
          url: data.voiceMessage.url,
          duration: data.voiceMessage.duration,
          mimeType: data.voiceMessage.mimeType,
          size: data.voiceMessage.size,
        },
        createdAt: data.timestamp,
        status: "delivered",
      };
      setMessages((prev) => [...prev, voiceMessage]);
    }
  });

  return () => {
    socket.off("new_voice_message");
  };
}, [socket, user._id]);
```

### Add Voice Message Handler
```javascript
const handleSendVoiceMessage = async (voiceData) => {
  if (!voiceData || !socket || !otherUser) return;

  try {
    // Emit to socket immediately (real-time delivery)
    socket.emit("voice_message", {
      senderId: user._id,
      senderName: user.name,
      recipientId: otherUser._id,
      voiceMessage: {
        url: voiceData.url,
        duration: voiceData.duration,
        mimeType: voiceData.mimeType,
        size: voiceData.size,
      },
      timestamp: new Date().toISOString(),
    });

    // Optionally save to database
    const config = {
      headers: { Authorization: `Bearer ${user.token}` },
    };
    
    // Note: You'll need to create this endpoint if you want persistence
    // await axios.post("http://localhost:8080/message/send/voice", {
    //   chatId: chatId,
    //   voiceMessage: voiceData,
    //   messageType: "voice",
    // }, config);

  } catch (error) {
    console.error("Error sending voice message:", error);
  }
};
```

### In Your JSX - Chat Header (Add Last Seen)
```javascript
return (
  <div className="chat-container">
    {/* Chat Header */}
    <div className="chat-header">
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <h2>{otherUser?.name}</h2>
        {otherUser && (
          <LastSeenDisplay
            userId={otherUser._id}
            userName={otherUser.name}
            token={user?.token}
          />
        )}
      </div>
    </div>

    {/* Messages Display */}
    <div className="messages-container">
      {messages.map((msg) => (
        <div key={msg._id} className={msg.sender._id === user._id ? "own-msg" : "other-msg"}>
          
          {/* Voice Message */}
          {msg.messageType === "voice" && msg.voiceMessage ? (
            <div className="voice-message">
              <audio
                controls
                style={{
                  maxWidth: "300px",
                  height: "32px",
                }}
                src={msg.voiceMessage.url}
              />
              <span style={{ fontSize: "12px", marginLeft: "8px" }}>
                {msg.voiceMessage.duration}s
              </span>
            </div>
          ) : (
            /* Text Message */
            <p>{msg.content}</p>
          )}
          
        </div>
      ))}
    </div>

    {/* Message Input */}
    <div className="message-input-area">
      <input
        type="text"
        value={messageText}
        onChange={(e) => setMessageText(e.target.value)}
        placeholder="Type a message..."
      />
      
      {/* Voice Button */}
      <VoiceMessageRecorder
        onSend={handleSendVoiceMessage}
        disabled={!socket}
      />
      
      <button onClick={() => handleSendMessage(messageText)}>
        Send
      </button>
    </div>
  </div>
);
```

---

## 🎙️ Example 2: Group Chat Component (ModernGroupChat.js)

### Add Voice Imports
```javascript
import VoiceMessageRecorder from "./VoiceMessageRecorder";
// ... existing imports
```

### Add Voice Listener (useEffect)
```javascript
useEffect(() => {
  if (!socket) return;

  socket.on("new_group_voice_message", (data) => {
    // Only add if group matches current group
    if (data.groupId === groupId) {
      const voiceMessage = {
        _id: data.messageId || Date.now(),
        sender: {
          _id: data.senderId,
          name: data.senderName
        },
        content: "",
        messageType: "voice",
        voiceMessage: {
          url: data.voiceMessage.url,
          duration: data.voiceMessage.duration,
          mimeType: data.voiceMessage.mimeType,
          size: data.voiceMessage.size,
        },
        createdAt: data.timestamp,
        status: "delivered",
      };
      setMessages((prev) => [...prev, voiceMessage]);
    }
  });

  return () => {
    socket.off("new_group_voice_message");
  };
}, [socket, groupId]);
```

### Add Voice Handler
```javascript
const handleSendVoiceMessage = async (voiceData) => {
  if (!voiceData || !socket || !groupId) return;

  try {
    // Emit to group
    socket.emit("group_message", {
      groupId: groupId,
      senderId: user._id,
      senderName: user.name,
      content: "",
      messageType: "voice",
      voiceMessage: {
        url: voiceData.url,
        duration: voiceData.duration,
        mimeType: voiceData.mimeType,
        size: voiceData.size,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error sending voice message:", error);
  }
};
```

### Update Message Display (MessageBubble)
```javascript
function MessageBubble({ message, user, isOwnMessage, onDelete }) {
  // ... existing code ...

  return (
    <div>
      {/* Existing sender name and other info */}
      
      {/* Voice Message Display */}
      {message.messageType === "voice" && message.voiceMessage ? (
        <div
          style={{
            background: isOwnMessage 
              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
              : "rgba(99, 102, 241, 0.12)",
            color: isOwnMessage ? "#f0f2f5" : "#f0f2f5",
            padding: "12px 16px",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            maxWidth: "70%",
          }}
        >
          <audio
            controls
            style={{
              maxWidth: "250px",
              height: "32px",
            }}
            src={message.voiceMessage.url}
          />
          <span
            style={{
              fontSize: "12px",
              whiteSpace: "nowrap",
              color: "rgba(240, 242, 245, 0.7)",
            }}
          >
            {message.voiceMessage.duration}s
          </span>
        </div>
      ) : (
        // Text message (existing)
        <div
          style={{
            background: isOwnMessage 
              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
              : "rgba(99, 102, 241, 0.12)",
            padding: "12px 16px",
            borderRadius: "16px",
          }}
        >
          <span>{message.content}</span>
        </div>
      )}
    </div>
  );
}
```

### In Message Input Section (Add Voice Button)
```javascript
// Find your message input JSX and add:
<div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
  {/* Existing buttons: emoji, attach, etc. */}
  
  {/* Voice Message Recorder */}
  <VoiceMessageRecorder
    onSend={handleSendVoiceMessage}
    disabled={!socket}
  />
  
  {/* Send Button */}
  <IconButton onClick={sendMessage}>
    <SendIcon />
  </IconButton>
</div>
```

---

## 👥 Example 3: Chat Header with Last Seen

### Simple Implementation
```javascript
import LastSeenDisplay from "./LastSeenDisplay";

function ChatHeader({ otherUser, userData }) {
  return (
    <div style={{
      padding: "16px",
      borderBottom: "1px solid #e5e7eb",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Avatar */}
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "20px",
          fontWeight: "bold",
        }}>
          {otherUser?.name[0]}
        </div>
        
        {/* Name and Last Seen */}
        <div>
          <h3 style={{ margin: "0 0 4px 0" }}>
            {otherUser?.name}
          </h3>
          <LastSeenDisplay
            userId={otherUser?._id}
            userName={otherUser?.name}
            token={userData?.data?.token}
          />
        </div>
      </div>
      
      {/* Action buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        {/* Call, video, more buttons */}
      </div>
    </div>
  );
}
```

---

## 🔌 Example 4: Complete Socket Setup

```javascript
useEffect(() => {
  const newSocket = io("http://localhost:8080", {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  newSocket.on("connect", () => {
    // Emit user online
    newSocket.emit("user_online", user._id);
    
    // Join group if in group chat
    if (groupId) {
      newSocket.emit("join_group", groupId);
    }
  });

  // Listen for one-to-one messages
  newSocket.on("new_message", (data) => {
    const newMsg = {
      _id: data._id,
      sender: { _id: data.senderId, name: data.senderName },
      content: data.content,
      messageType: "text",
      createdAt: data.timestamp,
    };
    setMessages((prev) => [...prev, newMsg]);
  });

  // Listen for voice messages
  newSocket.on("new_voice_message", (data) => {
    const voiceMsg = {
      _id: Date.now(),
      sender: { _id: data.senderId, name: data.senderName },
      content: "",
      messageType: "voice",
      voiceMessage: data.voiceMessage,
      createdAt: data.timestamp,
    };
    setMessages((prev) => [...prev, voiceMsg]);
  });

  // Listen for group messages
  newSocket.on("new_group_message", (data) => {
    if (data.groupId === groupId) {
      const newMsg = {
        _id: data._id || Date.now(),
        sender: { _id: data.senderId, name: data.senderName },
        content: data.content,
        messageType: data.messageType || "text",
        voiceMessage: data.voiceMessage,
        createdAt: data.timestamp,
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  });

  // Listen for group voice
  newSocket.on("new_group_voice_message", (data) => {
    if (data.groupId === groupId) {
      const voiceMsg = {
        _id: Date.now(),
        sender: { _id: data.senderId, name: data.senderName },
        content: "",
        messageType: "voice",
        voiceMessage: data.voiceMessage,
        createdAt: data.timestamp,
      };
      setMessages((prev) => [...prev, voiceMsg]);
    }
  });

  // Listen for user status changes
  newSocket.on("user_status_changed", (data) => {
    console.log(`User ${data.userId} is ${data.isOnline ? "online" : "offline"}`);
    // Update UI accordingly
  });

  setSocket(newSocket);

  return () => {
    newSocket.disconnect();
  };
}, [user._id, groupId]);
```

---

## 🧪 Testing Each Feature

### Test Last Seen (Copy-Paste This)
```javascript
// In browser console while testing:
// 1. Open chat with another user
// 2. Check component renders: <LastSeenDisplay {...} />
// 3. Should show "Online" with green dot
// 4. Close other browser window
// 5. Wait 5 seconds (polling interval)
// 6. Should change to "Last seen X seconds ago"

console.log("Last Seen Test:");
const statusElement = document.querySelector('[data-test="last-seen"]');
console.log("Status:", statusElement?.textContent);
```

### Test Voice Message (Copy-Paste This)
```javascript
// 1. Open chat between User A and User B
// 2. User A clicks mic button
// 3. Grant microphone permission
// 4. Speak for 5 seconds
// 5. Click "Stop" button
// 6. Click "Send" button
// 7. Check User B's window - should see audio player
// 8. Click play - should hear audio

console.log("Voice Message Test:");
const audioElements = document.querySelectorAll('audio');
console.log("Audio players found:", audioElements.length);
audioElements.forEach((audio, i) => {
  console.log(`Audio ${i}: src =`, audio.src);
});
```

---

## ✅ Checklist Before Production

- [ ] Last Seen displays correctly
- [ ] Voice button appears in message input
- [ ] Can record voice (microphone works)
- [ ] Audio plays after sending
- [ ] Recipient receives voice (check both windows)
- [ ] Only recipient receives one-to-one voice
- [ ] All group members receive group voice
- [ ] Text messages still work (no regression)
- [ ] Delete works on voice messages
- [ ] Socket reconnects properly

---

## 🚀 Ready to Integrate!

Copy these code examples into your actual components and test. If any issues, check the Architecture Guide for detailed explanations.
