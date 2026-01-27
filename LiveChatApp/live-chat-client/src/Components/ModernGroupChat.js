import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { myContext } from "./MainContainer";
import {
  Send as SendIcon,
  EmojiEmotions as EmojiIcon,
  AttachFile as AttachIcon,
  Call as CallIcon,
  Videocam as VideoIcon,
  MoreVert as MoreIcon,
  Search as SearchIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { IconButton } from "@mui/material";
import EmojiPicker from "emoji-picker-react";
import io from "socket.io-client";
import "./myStyles.css";

function ModernGroupChat() {
  const { groupId } = useParams();
  const nav = useNavigate();
  const { refresh } = useContext(myContext);
  const lightTheme = useSelector((state) => state.themeKey);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [groupSearch, setGroupSearch] = useState("");

  const userData = JSON.parse(localStorage.getItem("userData"));
  if (!userData) {
    nav("/");
  }
  const user = userData.data;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.io
  useEffect(() => {
    const newSocket = io("http://localhost:8080", {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      newSocket.emit("user_online", user._id);
      newSocket.emit("join_group", groupId);
    });

    newSocket.on("new_group_message", (data) => {
      if (data.groupId === groupId) {
        const newMessage = {
          _id: Date.now(),
          sender: { _id: data.senderId, name: data.senderName },
          content: data.content,
          createdAt: data.timestamp,
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    });

    newSocket.on("typing", (data) => {
      if (data.groupId === groupId && data.userId !== user._id) {
        setTypingUsers((prev) => {
          if (!prev.find((u) => u.userId === data.userId)) {
            return [...prev, { userId: data.userId, userName: data.userName }];
          }
          return prev;
        });
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
        }, 3000);
      }
    });

    newSocket.on("user_online_group", (data) => {
      if (data.groupId === groupId) {
        setOnlineMembers(data.onlineMembers || []);
      }
    });

    setSocket(newSocket);
    return () => {
      if (newSocket) {
        newSocket.emit("leave_group", groupId);
        newSocket.disconnect();
      }
    };
  }, [groupId, user._id]);

  // Fetch group data
  useEffect(() => {
    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };

    Promise.all([
      axios.get(`http://localhost:8080/group/`, config),
      axios.get(`http://localhost:8080/group/${groupId}/messages`, config),
    ])
      .then(([groupsResponse, messagesResponse]) => {
        const currentGroup = groupsResponse.data.find((g) => g._id === groupId);
        if (currentGroup) {
          setGroup(currentGroup);
          setAllGroups(groupsResponse.data || []);
          setMessages(messagesResponse.data || []);
          setOnlineMembers(currentGroup.members || []);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setLoading(false);
      });
  }, [groupId, refresh]);

  const sendMessage = () => {
    if (!messageContent.trim()) return;

    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    };

    const tempContent = messageContent;

    const payload = {
      message: tempContent,
      groupId: groupId,
      senderId: user._id,
    };

    // Send to server
    axios
      .post("http://localhost:8080/group/message/send", payload, config)
      .then((response) => {
        // Add message to UI ONLY after backend confirms success
        setMessages((prevMessages) => [...prevMessages, response.data]);
        setMessageContent("");

        if (socket) {
          socket.emit("group_message", {
            groupId: groupId,
            senderId: user._id,
            senderName: user.name,
            content: tempContent,
            timestamp: response.data.createdAt,
          });
        }
      })
      .catch((error) => {
        console.error("Error sending message:", error.response?.data || error.message);
      });

  };

  const onEmojiClick = (emojiObject) => {
    setMessageContent(messageContent + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleTyping = (e) => {
    setMessageContent(e.target.value);
    if (socket) {
      socket.emit("typing", {
        userId: user._id,
        userName: user.name,
      });
    }
  };

  const filteredGroups = allGroups.filter((g) =>
    g.groupName.toLowerCase().includes(groupSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", backgroundColor: "#0a0e27" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "#f0f2f5" }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#0a0e27" }}>
      {/* Left Sidebar */}
      <div
        style={{
          width: "300px",
          background: "linear-gradient(135deg, rgba(18, 23, 47, 0.95) 0%, rgba(26, 38, 71, 0.95) 100%)",
          borderRight: "1px solid rgba(99, 102, 241, 0.15)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(10px)",
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid rgba(99, 102, 241, 0.1)" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: "700", color: "#f0f2f5" }}>
            Chats
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              borderRadius: "20px",
              padding: "8px 12px",
              border: "1px solid rgba(99, 102, 241, 0.15)",
            }}
          >
            <SearchIcon sx={{ fontSize: "20px", color: "rgba(240, 242, 245, 0.5)" }} />
            <input
              placeholder="Search groups..."
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                backgroundColor: "transparent",
                outline: "none",
                fontSize: "13px",
                color: "#f0f2f5",
              }}
            />
          </div>
        </div>

        {/* Groups List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {filteredGroups.map((g) => {
            const lastMessage = messages.filter(m => m).pop();
            return (
              <div
                key={g._id}
                onClick={() => nav(`/app/group/${g._id}`)}
                style={{
                  padding: "12px 8px",
                  marginBottom: "4px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  backgroundColor: g._id === groupId ? "rgba(99, 102, 241, 0.15)" : "transparent",
                  borderLeft: g._id === groupId ? "4px solid #6366f1" : "4px solid transparent",
                  paddingLeft: "8px",
                  transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
                onMouseOver={(e) => {
                  if (g._id !== groupId) {
                    e.currentTarget.style.backgroundColor = "rgba(168, 85, 247, 0.1)";
                    e.currentTarget.style.borderLeft = "4px solid rgba(168, 85, 247, 0.3)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }
                }}
                onMouseOut={(e) => {
                  if (g._id !== groupId) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderLeft = "4px solid transparent";
                    e.currentTarget.style.transform = "translateX(0)";
                  }
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: g._id === groupId
                      ? "linear-gradient(135deg, #6366f1, #a855f7)"
                      : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#f0f2f5",
                    fontSize: "18px",
                    fontWeight: "700",
                    flexShrink: 0,
                    boxShadow: g._id === groupId ? "0 4px 16px rgba(99, 102, 241, 0.4)" : "0 2px 8px rgba(99, 102, 241, 0.2)",
                  }}
                >
                  {g.groupName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ 
                      margin: "0 0 4px 0", 
                      fontSize: "14px", 
                      fontWeight: g._id === groupId ? "700" : "600", 
                      color: "#f0f2f5",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {g.groupName}
                    </p>
                    <span style={{
                      fontSize: "11px",
                      color: "rgba(240, 242, 245, 0.5)",
                      whiteSpace: "nowrap",
                      marginLeft: "8px",
                    }}>
                      Now
                    </span>
                  </div>
                  <p
                    style={{
                      margin: "0",
                      fontSize: "12px",
                      color: "rgba(240, 242, 245, 0.6)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {g.members.length} members • {lastMessage ? "Recent message" : "No messages yet"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Group Button */}
        <div
          onClick={() => nav("/app/create-groups")}
          style={{
            margin: "8px",
            padding: "12px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #06b6d4, #0891b2)",
            color: "#f0f2f5",
            cursor: "pointer",
            textAlign: "center",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 4px 12px rgba(6, 182, 212, 0.2)",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = "0 8px 20px rgba(6, 182, 212, 0.4)";
            e.currentTarget.style.transform = "translateY(-2px)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(6, 182, 212, 0.2)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <AddIcon sx={{ fontSize: "20px" }} />
          New Group
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#0a0e27" }}>
        {group ? (
          <>
            {/* Chat Header */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(18, 23, 47, 0.98) 0%, rgba(26, 38, 71, 0.98) 100%)",
                borderBottom: "1px solid rgba(99, 102, 241, 0.15)",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f0f2f5",
                  fontSize: "24px",
                  fontWeight: "700",
                  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)",
                }}
              >
                {group.groupName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "700", color: "#f0f2f5" }}>
                  {group.groupName}
                </h3>
                <p style={{ margin: "0", fontSize: "13px", color: "#06b6d4", fontWeight: "500" }}>
                  🟢 {onlineMembers.length} online
                </p>
              </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <IconButton
                  sx={{
                    color: "#6366f1",
                    "&:hover": { backgroundColor: "rgba(99, 102, 241, 0.1)" },
                  }}
                >
                  <CallIcon sx={{ fontSize: "20px" }} />
                </IconButton>
                <IconButton
                  sx={{
                    color: "#6366f1",
                    "&:hover": { backgroundColor: "rgba(99, 102, 241, 0.1)" },
                  }}
                >
                  <VideoIcon sx={{ fontSize: "20px" }} />
                </IconButton>
                <IconButton
                  sx={{
                    color: "rgba(240, 242, 245, 0.5)",
                    "&:hover": { backgroundColor: "rgba(240, 242, 245, 0.05)" },
                  }}
                >
                  <MoreIcon sx={{ fontSize: "20px" }} />
                </IconButton>
              </div>
            </div>

            {/* Messages Container */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                backgroundColor: "#0a0e27",
              }}
            >
              {messages.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    flexDirection: "column",
                    gap: "12px",
                    color: "rgba(240, 242, 245, 0.5)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "48px",
                      marginBottom: "8px",
                    }}
                  >
                    💬
                  </div>
                  <p style={{ fontSize: "15px", fontWeight: "500" }}>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwnMessage = message.sender._id === user._id;
                  return (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                        marginBottom: "2px",
                        animation: "slideIn 0.3s ease",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "60%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isOwnMessage ? "flex-end" : "flex-start",
                          gap: "2px",
                        }}
                      >
                        {!isOwnMessage && (
                          <p
                            style={{
                              margin: "0 0 8px 0",
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "#06b6d4",
                              paddingLeft: "8px",
                              textTransform: "capitalize",
                              letterSpacing: "0.3px",
                            }}
                          >
                            {message.sender.name}
                          </p>
                        )}
                        <div
                          style={{
                            background: isOwnMessage 
                              ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                              : "rgba(99, 102, 241, 0.12)",
                            color: isOwnMessage ? "#f0f2f5" : "#f0f2f5",
                            padding: "14px 18px",
                            borderRadius: "18px",
                            wordBreak: "break-word",
                            lineHeight: "1.6",
                            fontSize: "16px",
                            fontWeight: "500",
                            boxShadow: isOwnMessage 
                              ? "0 4px 12px rgba(99, 102, 241, 0.3)" 
                              : "0 2px 8px rgba(99, 102, 241, 0.15)",
                            maxWidth: "65%",
                          }}
                        >
                          {message.content}
                        </div>
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: "12px",
                            color: "rgba(240, 242, 245, 0.5)",
                            paddingLeft: isOwnMessage ? "0" : "8px",
                            paddingRight: isOwnMessage ? "8px" : "0",
                          }}
                        >
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    color: "rgba(240, 242, 245, 0.5)",
                    marginTop: "8px",
                  }}
                >
                  <span>{typingUsers.map((u) => u.userName).join(", ")} is typing</span>
                  <span style={{ display: "flex", gap: "2px" }}>
                    <span
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        backgroundColor: "#6366f1",
                        animation: "bounce 1s infinite",
                      }}
                    />
                    <span
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        backgroundColor: "#6366f1",
                        animation: "bounce 1s infinite",
                        animationDelay: "0.2s",
                      }}
                    />
                    <span
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        backgroundColor: "#6366f1",
                        animation: "bounce 1s infinite",
                        animationDelay: "0.4s",
                      }}
                    />
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(18, 23, 47, 0.95) 0%, rgba(26, 38, 71, 0.95) 100%)",
                borderTop: "1px solid rgba(99, 102, 241, 0.15)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-end",
                gap: "12px",
                boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.3)",
                backdropFilter: "blur(10px)",
              }}
            >
              {showEmojiPicker && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "110px",
                    left: "20px",
                    zIndex: 1000,
                  }}
                >
                  <EmojiPicker onEmojiClick={onEmojiClick} />
                </div>
              )}

              <IconButton
                size="small"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                sx={{
                  color: "#6366f1",
                  padding: "8px",
                  "&:hover": { backgroundColor: "rgba(99, 102, 241, 0.1)" },
                }}
              >
                <EmojiIcon sx={{ fontSize: "22px" }} />
              </IconButton>

              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  color: "#6366f1",
                  padding: "8px",
                  "&:hover": { backgroundColor: "rgba(99, 102, 241, 0.1)" },
                }}
              >
                <AttachIcon sx={{ fontSize: "22px" }} />
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
              />

              <input
                type="text"
                placeholder="Type a message..."
                value={messageContent}
                onChange={handleTyping}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                style={{
                  flex: 1,
                  padding: "12px 18px",
                  border: "1px solid rgba(99, 102, 241, 0.15)",
                  borderRadius: "24px",
                  backgroundColor: "rgba(99, 102, 241, 0.08)",
                  color: "#f0f2f5",
                  fontSize: "15px",
                  outline: "none",
                  transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#6366f1";
                  e.target.style.backgroundColor = "rgba(99, 102, 241, 0.12)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.15)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(99, 102, 241, 0.15)";
                  e.target.style.backgroundColor = "rgba(99, 102, 241, 0.08)";
                  e.target.style.boxShadow = "none";
                }}
              />

              <IconButton
                onClick={sendMessage}
                disabled={!messageContent.trim()}
                sx={{
                  background: messageContent.trim() 
                    ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                    : "rgba(99, 102, 241, 0.3)",
                  color: messageContent.trim() ? "#f0f2f5" : "rgba(240, 242, 245, 0.4)",
                  borderRadius: "50%",
                  padding: "12px",
                  transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: messageContent.trim() ? "0 4px 12px rgba(99, 102, 241, 0.3)" : "none",
                  "&:hover": {
                    background: messageContent.trim() ? "linear-gradient(135deg, #8b5cf6, #a855f7)" : "rgba(99, 102, 241, 0.3)",
                    transform: messageContent.trim() ? "scale(1.05)" : "none",
                    boxShadow: messageContent.trim() ? "0 6px 20px rgba(99, 102, 241, 0.4)" : "none",
                  },
                }}
              >
                <SendIcon sx={{ fontSize: "20px" }} />
              </IconButton>
            </div>
          </>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "rgba(240, 242, 245, 0.5)",
            }}
          >
            <p>Group not found</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>
  );
}

export default ModernGroupChat;
