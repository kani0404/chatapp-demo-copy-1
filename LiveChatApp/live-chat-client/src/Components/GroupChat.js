import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { myContext } from "./MainContainer";
import SendIcon from "@mui/icons-material/Send";
import GroupIcon from "@mui/icons-material/Group";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import { IconButton } from "@mui/material";
import io from "socket.io-client";
import "./myStyles.css";

function GroupChat() {
  const { groupId } = useParams();
  const nav = useNavigate();
  const { refresh, setRefresh } = useContext(myContext);
  const lightTheme = useSelector((state) => state.themeKey);
  const messagesEndRef = useRef(null);

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [allGroups, setAllGroups] = useState([]);

  const userData = JSON.parse(localStorage.getItem("userData"));
  if (!userData) {
    nav("/");
  }
  const user = userData.data;

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io("http://localhost:8080", {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setSocketConnected(true);
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
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setSocketConnected(false);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.emit("leave_group", groupId);
        newSocket.disconnect();
      }
    };
  }, [groupId, user._id]);

  // Fetch group details and messages
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
        } else {
          alert("Group not found");
          nav("/app/groups");
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching group data:", error);
        alert("Error loading group");
        nav("/app/groups");
      });
  }, [groupId, refresh]);

  const sendMessage = () => {
    if (!messageContent.trim()) {
      return;
    }

    const messageData = {
      content: messageContent,
      groupId: groupId,
    };

    console.log("=== SENDING MESSAGE ===");
    console.log("Message data:", messageData);
    console.log("User token:", user.token ? "✓ Present" : "✗ Missing");
    console.log("Group ID:", groupId);
    console.log("Message content:", messageContent);

    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
    };

    axios
      .post(
        "http://localhost:8080/group/message/send",
        messageData,
        config
      )
      .then((response) => {
        console.log("Message sent successfully:", response.data);
        // Emit via Socket.io for real-time update to others
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
        console.error("=== ERROR SENDING MESSAGE ===");
        console.error("Error:", error);
        console.error("Response:", error.response?.data);
        console.error("Status:", error.response?.status);
        alert("Error sending message: " + (error.response?.data?.message || error.message));
      });
  };

  const leaveGroup = () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      axios
        .post(`http://localhost:8080/group/${groupId}/leave`, {}, config)
        .then(() => {
          if (socket) {
            socket.emit("leave_group", groupId);
          }
          alert("Left group successfully");
          nav("/app/groups");
        })
        .catch((error) => {
          console.error("Error leaving group:", error);
          alert("Error leaving group");
        });
    }
  };

  if (loading) {
    return (
      <div className={"main-chat-container" + (lightTheme ? "" : " dark")}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <p>Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className={"main-chat-container" + (lightTheme ? "" : " dark")}>
        <p>Group not found</p>
      </div>
    );
  }

  return (
    <div className={"main-chat-container" + (lightTheme ? "" : " dark")} style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Horizontal Groups Bar */}
      <div style={{
        backgroundColor: lightTheme ? "#FFFFFF" : "#0F172A",
        borderBottom: "1px solid " + (lightTheme ? "#E5E7EB" : "#1F2937"),
        padding: "12px 20px",
        overflowX: "auto",
        overflowY: "hidden",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        justifyContent: "center",
        scrollBehavior: "smooth",
        scrollbarWidth: "none",
        position: "relative",
      }}>
        {/* Left Scroll Groups */}
        <div style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          overflowX: "auto",
          scrollbarWidth: "none",
          maxWidth: "calc(50% - 50px)",
        }}>
          {allGroups.slice(0, Math.ceil(allGroups.length / 2)).map((g) => (
            <div
              key={g._id}
              onClick={() => nav(`/app/group/${g._id}`)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                flex: "0 0 auto",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: g._id === groupId 
                    ? "linear-gradient(135deg, #0084FF, #0073E6)" 
                    : "linear-gradient(135deg, #3B82F6, #1E40AF)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "700",
                  border: g._id === groupId ? "3px solid #0084FF" : "2px solid transparent",
                  boxShadow: g._id === groupId ? "0 0 12px rgba(0, 132, 255, 0.4)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.3s ease",
                }}
              >
                {g.groupName.charAt(0).toUpperCase()}
              </div>
              <p
                style={{
                  margin: "0",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: g._id === groupId ? "#0084FF" : (lightTheme ? "#6B7280" : "#9CA3AF"),
                  maxWidth: "56px",
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {g.groupName}
              </p>
            </div>
          ))}
        </div>

        {/* Center Create Group Button */}
        <div
          onClick={() => nav("/app/create-groups")}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            flex: "0 0 auto",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #10B981, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "24px",
              fontWeight: "700",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease",
              border: "2px solid transparent",
            }}
          >
            <AddCircleIcon sx={{ fontSize: "32px" }} />
          </div>
          <p
            style={{
              margin: "0",
              fontSize: "11px",
              fontWeight: "600",
              color: lightTheme ? "#6B7280" : "#9CA3AF",
              maxWidth: "56px",
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Create
          </p>
        </div>

        {/* Right Scroll Groups */}
        <div style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          overflowX: "auto",
          scrollbarWidth: "none",
          maxWidth: "calc(50% - 50px)",
        }}>
          {allGroups.slice(Math.ceil(allGroups.length / 2)).map((g) => (
            <div
              key={g._id}
              onClick={() => nav(`/app/group/${g._id}`)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                flex: "0 0 auto",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: g._id === groupId 
                    ? "linear-gradient(135deg, #0084FF, #0073E6)" 
                    : "linear-gradient(135deg, #3B82F6, #1E40AF)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "700",
                  border: g._id === groupId ? "3px solid #0084FF" : "2px solid transparent",
                  boxShadow: g._id === groupId ? "0 0 12px rgba(0, 132, 255, 0.4)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.3s ease",
                }}
              >
                {g.groupName.charAt(0).toUpperCase()}
              </div>
              <p
                style={{
                  margin: "0",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: g._id === groupId ? "#0084FF" : (lightTheme ? "#6B7280" : "#9CA3AF"),
                  maxWidth: "56px",
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {g.groupName}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Header - Web Layout */}
      <div style={{
        backgroundColor: lightTheme ? "#F3F4F6" : "#1F2937",
        borderBottom: "1px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
        padding: "20px 40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        minHeight: "80px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", flex: 1 }}>
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #3B82F6, #1E40AF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: "24px",
            fontWeight: "600",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
          }}>
            {group.groupName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{
              margin: "0 0 6px 0",
              color: lightTheme ? "#1F2937" : "#E5E7EB",
              fontSize: "20px",
              fontWeight: "700",
            }}>
              {group.groupName}
            </h2>
            <p style={{
              margin: "0",
              color: lightTheme ? "#6B7280" : "#9CA3AF",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}>
              <GroupIcon sx={{ fontSize: "16px" }} />
              {group.members.length} members
            </p>
          </div>
        </div>
        <button
          onClick={leaveGroup}
          style={{
            padding: "10px 20px",
            backgroundColor: "#EF4444",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "600",
            transition: "all 0.3s ease",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = "#DC2626";
            e.target.style.boxShadow = "0 4px 8px rgba(239, 68, 68, 0.3)";
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = "#EF4444";
            e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
          }}
        >
          Leave Group
        </button>
      </div>

      {/* Messages Container - Web Layout */}
      <div className={"messages-container" + (lightTheme ? "" : " dark")} style={{ 
        justifyContent: "flex-end",
        flex: 1,
        overflowY: "auto",
        padding: "30px 40px",
        backgroundColor: lightTheme ? "#FFFFFF" : "#111827",
      }}>
        {messages.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "60px 20px",
            color: lightTheme ? "#9CA3AF" : "#6B7280",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}>
            <GroupIcon sx={{ fontSize: "64px", marginBottom: "20px", opacity: 0.4 }} />
            <p style={{ fontSize: "16px", fontWeight: "500" }}>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`message-row ${message.sender._id === user._id ? "own" : ""}`}
              style={{
                justifyContent: message.sender._id === user._id ? "flex-end" : "flex-start",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: message.sender._id === user._id ? "flex-end" : "flex-start",
                  maxWidth: "55%",
                  animation: "fadeIn 0.3s ease",
                }}
              >
                {message.sender._id !== user._id && (
                  <p style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: lightTheme ? "#3B82F6" : "#60A5FA",
                    marginBottom: "6px",
                    marginLeft: "4px",
                  }}>
                    {message.sender.name}
                  </p>
                )}
                <div
                  style={{
                    backgroundColor: message.sender._id === user._id ? "#0084FF" : (lightTheme ? "#E5E7EB" : "#374151"),
                    color: message.sender._id === user._id ? "#FFFFFF" : (lightTheme ? "#1F2937" : "#E5E7EB"),
                    padding: "14px 18px",
                    borderRadius: "16px",
                    wordBreak: "break-word",
                    lineHeight: "1.5",
                    fontSize: "15px",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  {message.content}
                </div>
                <p style={{
                  fontSize: "12px",
                  color: lightTheme ? "#9CA3AF" : "#6B7280",
                  marginTop: "6px",
                  marginLeft: message.sender._id !== user._id ? "4px" : "0",
                  marginRight: message.sender._id === user._id ? "4px" : "0",
                }}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Web Layout */}
      <div style={{
        backgroundColor: lightTheme ? "#F9FAFB" : "#1F2937",
        borderTop: "1px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
        padding: "20px 40px",
        display: "flex",
        gap: "16px",
        alignItems: "flex-end",
        minHeight: "90px",
      }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={messageContent}
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          style={{
            flex: 1,
            padding: "14px 18px",
            border: "1px solid " + (lightTheme ? "#D1D5DB" : "#374151"),
            borderRadius: "26px",
            backgroundColor: lightTheme ? "#FFFFFF" : "#111827",
            color: lightTheme ? "#1F2937" : "#E5E7EB",
            fontSize: "15px",
            outline: "none",
            transition: "all 0.3s ease",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#0084FF";
            e.target.style.boxShadow = "0 0 0 3px rgba(0, 132, 255, 0.15)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = lightTheme ? "#D1D5DB" : "#374151";
            e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
          }}
        />
        <IconButton
          onClick={sendMessage}
          disabled={!messageContent.trim()}
          sx={{
            backgroundColor: messageContent.trim() ? "#0084FF" : "#D1D5DB",
            color: "white",
            padding: "12px",
            borderRadius: "50%",
            transition: "all 0.3s ease",
            boxShadow: messageContent.trim() ? "0 2px 8px rgba(0, 132, 255, 0.3)" : "none",
            "&:hover": {
              backgroundColor: messageContent.trim() ? "#0073E6" : "#D1D5DB",
              transform: messageContent.trim() ? "scale(1.05)" : "none",
            },
            "&:disabled": {
              backgroundColor: "#D1D5DB",
              color: "#FFFFFF",
            },
          }}
        >
          <SendIcon sx={{ fontSize: "22px" }} />
        </IconButton>
      </div>
    </div>
  );
}

export default GroupChat;
