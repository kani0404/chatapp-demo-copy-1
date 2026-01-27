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

    axios
      .post("http://localhost:8080/group/message/send", {
        content: messageContent,
        groupId: groupId,
      }, config)
      .then((response) => {
        if (socket) {
          socket.emit("group_message", {
            groupId: groupId,
            senderId: user._id,
            senderName: user.name,
            content: messageContent,
            timestamp: new Date().toISOString(),
          });
        }
        setMessages([...messages, response.data]);
        setMessageContent("");
      })
      .catch((error) => {
        console.error("Error:", error);
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
        groupId: groupId,
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
      <div style={{ display: "flex", height: "100vh", backgroundColor: "#F5F5F5" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#F5F5F5" }}>
      {/* Left Sidebar */}
      <div
        style={{
          width: "300px",
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid #E0E0E0",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        {/* Sidebar Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #E0E0E0" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "20px", fontWeight: "700", color: "#1F2937" }}>
            Chats
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#F3F4F6",
              borderRadius: "20px",
              padding: "8px 12px",
              border: "1px solid #E5E7EB",
            }}
          >
            <SearchIcon sx={{ fontSize: "20px", color: "#9CA3AF" }} />
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
                color: "#1F2937",
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
                  backgroundColor: g._id === groupId ? "#E3F2FD" : "transparent",
                  borderLeft: g._id === groupId ? "4px solid #1976D2" : "4px solid transparent",
                  paddingLeft: "8px",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
                onMouseOver={(e) => {
                  if (g._id !== groupId) {
                    e.currentTarget.style.backgroundColor = "#F5F5F5";
                    e.currentTarget.style.borderLeft = "4px solid #E5E7EB";
                  }
                }}
                onMouseOut={(e) => {
                  if (g._id !== groupId) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderLeft = "4px solid transparent";
                  }
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: g._id === groupId
                      ? "linear-gradient(135deg, #1976D2, #1565C0)"
                      : "linear-gradient(135deg, #42A5F5, #1E88E5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "18px",
                    fontWeight: "700",
                    flexShrink: 0,
                    boxShadow: g._id === groupId ? "0 2px 8px rgba(25, 118, 210, 0.3)" : "none",
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
                      color: "#1F2937",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {g.groupName}
                    </p>
                    <span style={{
                      fontSize: "11px",
                      color: "#9CA3AF",
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
                      color: "#9CA3AF",
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
            backgroundColor: "#10B981",
            color: "white",
            cursor: "pointer",
            textAlign: "center",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#059669";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "#10B981";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <AddIcon sx={{ fontSize: "20px" }} />
          New Group
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {group ? (
          <>
            {/* Chat Header */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderBottom: "1px solid #E0E0E0",
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #1976D2, #1565C0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "18px",
                    fontWeight: "700",
                  }}
                >
                  {group.groupName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: "0", fontSize: "15px", fontWeight: "700", color: "#1F2937" }}>
                    {group.groupName}
                  </h3>
                  <p style={{ margin: "0", fontSize: "12px", color: "#10B981" }}>
                    {onlineMembers.length} online
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <IconButton
                  sx={{
                    color: "#1976D2",
                    "&:hover": { backgroundColor: "#E3F2FD" },
                  }}
                >
                  <CallIcon sx={{ fontSize: "20px" }} />
                </IconButton>
                <IconButton
                  sx={{
                    color: "#1976D2",
                    "&:hover": { backgroundColor: "#E3F2FD" },
                  }}
                >
                  <VideoIcon sx={{ fontSize: "20px" }} />
                </IconButton>
                <IconButton
                  sx={{
                    color: "#9CA3AF",
                    "&:hover": { backgroundColor: "#F3F4F6" },
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
                backgroundColor: "#FAFAFA",
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
                    color: "#9CA3AF",
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
                              margin: "0 0 6px 0",
                              fontSize: "13px",
                              fontWeight: "700",
                              color: "#0084FF",
                              paddingLeft: "8px",
                            }}
                          >
                            {message.sender.name}
                          </p>
                        )}
                        <div
                          style={{
                            backgroundColor: isOwnMessage ? "#1976D2" : "#FFFFFF",
                            color: isOwnMessage ? "#FFFFFF" : "#1F2937",
                            padding: "12px 16px",
                            borderRadius: isOwnMessage ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            wordBreak: "break-word",
                            lineHeight: "1.5",
                            fontSize: "15px",
                            boxShadow: isOwnMessage 
                              ? "0 1px 3px rgba(25, 118, 210, 0.2)" 
                              : "0 1px 2px rgba(0,0,0,0.05)",
                          }}
                        >
                          {message.content}
                        </div>
                        <p
                          style={{
                            margin: "4px 0 0 0",
                            fontSize: "12px",
                            color: "#9CA3AF",
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
                    color: "#9CA3AF",
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
                        backgroundColor: "#9CA3AF",
                        animation: "bounce 1s infinite",
                      }}
                    />
                    <span
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        backgroundColor: "#9CA3AF",
                        animation: "bounce 1s infinite",
                        animationDelay: "0.2s",
                      }}
                    />
                    <span
                      style={{
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        backgroundColor: "#9CA3AF",
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
                backgroundColor: "#FFFFFF",
                borderTop: "1px solid #E5E7EB",
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-end",
                gap: "12px",
                boxShadow: "0 -2px 4px rgba(0,0,0,0.02)",
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
                  color: "#1976D2",
                  padding: "8px",
                  "&:hover": { backgroundColor: "#E3F2FD" },
                }}
              >
                <EmojiIcon sx={{ fontSize: "22px" }} />
              </IconButton>

              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  color: "#1976D2",
                  padding: "8px",
                  "&:hover": { backgroundColor: "#E3F2FD" },
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
                  border: "1px solid #E5E7EB",
                  borderRadius: "24px",
                  backgroundColor: "#F9FAFB",
                  color: "#1F2937",
                  fontSize: "15px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#1976D2";
                  e.target.style.backgroundColor = "#FFFFFF";
                  e.target.style.boxShadow = "0 0 0 3px rgba(25, 118, 210, 0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E5E7EB";
                  e.target.style.backgroundColor = "#F9FAFB";
                  e.target.style.boxShadow = "none";
                }}
              />

              <IconButton
                onClick={sendMessage}
                disabled={!messageContent.trim()}
                sx={{
                  backgroundColor: messageContent.trim() ? "#1976D2" : "#D1D5DB",
                  color: "white",
                  borderRadius: "50%",
                  padding: "12px",
                  transition: "all 0.2s ease",
                  boxShadow: messageContent.trim() ? "0 2px 8px rgba(25, 118, 210, 0.3)" : "none",
                  "&:hover": {
                    backgroundColor: messageContent.trim() ? "#1565C0" : "#D1D5DB",
                    transform: messageContent.trim() ? "scale(1.05)" : "none",
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
              color: "#9CA3AF",
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
