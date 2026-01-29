import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { myContext } from "./MainContainer";
import SendIcon from "@mui/icons-material/Send";
import GroupIcon from "@mui/icons-material/Group";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import { IconButton } from "@mui/material";
import io from "socket.io-client";
import "./myStyles.css";
import ImageModal from "./ImageModal";

function GroupChat() {
  const { groupId } = useParams();
  const nav = useNavigate();
  const { refresh, setRefresh } = useContext(myContext);
  const lightTheme = useSelector((state) => state.themeKey);
  const messagesEndRef = useRef(null);

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageContent, setMessageContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [allGroups, setAllGroups] = useState([]);

  import emojis from "./emojiList";

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

    // Listen for reaction updates for group messages
    newSocket.on('message_reaction_updated', (data) => {
      if (data.group && data.group._id === groupId) {
        setMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
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

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (f && f.size > 25 * 1024 * 1024) {
      alert('File size must be less than 25MB');
      return;
    }
    setSelectedFile(f);
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const sendMessage = async () => {
    if (!messageContent.trim() && !selectedFile) {
      return;
    }

    // Prepare file preview data and capture the file to send
    const fileToSend = selectedFile;
    let fileData = null;

    if (fileToSend) {
      try {
        const base64 = await convertFileToBase64(fileToSend);
        fileData = {
          originalName: fileToSend.name,
          mimeType: fileToSend.type,
          size: fileToSend.size,
          base64,
        };
      } catch (error) {
        console.error('Error converting file:', error);
        return;
      }
    }

    // Optimistic message
    const tempMessage = {
      _id: Date.now(),
      sender: { _id: user._id, name: user.name },
      content: messageContent,
      file: fileData,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    setMessageContent('');
    setSelectedFile(null);

    const formData = new FormData();
    formData.append('content', tempMessage.content);
    formData.append('groupId', groupId);
    if (fileToSend) formData.append('file', fileToSend);

    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };

    try {
      const { data } = await axios.post('http://localhost:8080/group/message/send', formData, config);

      // Replace temp message with server message
      setMessages((prev) => prev.map((m) => (m._id === tempMessage._id ? data : m)));

      // Emit via socket
      if (socket) {
        socket.emit('group_message', {
          groupId: groupId,
          senderId: user._id,
          senderName: user.name,
          content: data.content,
          timestamp: data.createdAt || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error sending group message:', error);
      alert('Error sending message');
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => m._id !== tempMessage._id));
    }
  };

  // Toggle reaction on a group message
  const handleReactGroup = async (messageId, emoji) => {
    const config = { headers: { Authorization: `Bearer ${user.token}` } };
    try {
      const { data } = await axios.post(`http://localhost:8080/group/message/${messageId}/react`, { emoji }, config);
      setMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
    } catch (error) {
      console.error('Error reacting to group message:', error);
    }
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
                {message.file && (
                  <div style={{ marginTop: 8 }}>
                    {message.file.mimeType && message.file.mimeType.startsWith('image/') ? (
                      <img
                        src={message.file.url ? message.file.url : `data:${message.file.mimeType};base64,${message.file.base64}`}
                        alt="Shared"
                        onClick={() => setSelectedImage(message.file.url ? message.file.url : `data:${message.file.mimeType};base64,${message.file.base64}`)}
                        style={{ maxWidth: 300, maxHeight: 300, borderRadius: 12, cursor: 'pointer' }}
                      />
                    ) : (
                      <div onClick={() => {
                        if (message.file.url) window.open(message.file.url, '_blank');
                        else {
                          // construct data url from base64
                          const link = document.createElement('a');
                          link.href = `data:${message.file.mimeType};base64,${message.file.base64}`;
                          link.download = message.file.originalName;
                          link.click();
                        }
                      }} style={{ marginTop: 8, backgroundColor: message.sender._id === user._id ? '#0369a1' : 'rgba(99, 102, 241, 0.12)', color: message.sender._id === user._id ? '#fff' : (lightTheme ? '#1F2937' : '#E5E7EB'), padding: '10px 12px', borderRadius: 10, display: 'inline-block', cursor: 'pointer' }}>
                        📎 {message.file.originalName}
                      </div>
                    )}
                  </div>
                )
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

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
                    {message.reactions.map((r) => {
                      const currentUserId = user._id;
                      const reacted = r.users && r.users.find((u) => (u._id ? u._id.toString() : u.toString()) === currentUserId);
                      return (
                        <div
                          key={r.emoji}
                          onClick={() => handleReactGroup(message._id, r.emoji)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            background: reacted ? (message.sender._id === user._id ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)') : 'rgba(0,0,0,0.04)',
                            cursor: 'pointer',
                            color: message.sender._id === user._id ? '#ffffff' : (lightTheme ? '#1F2937' : '#E5E7EB'),
                            fontWeight: 600,
                          }}
                        >
                          <span>{r.emoji}</span>
                          <span style={{ fontSize: '12px' }}>{r.users.length}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Reaction picker button */}
                <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); const picker = e.currentTarget.nextSibling; if (picker) picker.style.display = picker.style.display === 'flex' ? 'none' : 'flex'; }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: message.sender._id === user._id ? '#ffffff' : (lightTheme ? '#1F2937' : '#E5E7EB'),
                      fontSize: '18px',
                      padding: '4px',
                    }}
                    title="React"
                  >
                    😄
                  </button>
                  <div style={{ display: 'none', gap: '6px', marginLeft: '8px', background: message.sender._id === user._id ? '#0F172A' : '#F9FAFB', padding: '8px', borderRadius: '8px' }}>
                    {emojis.map((e, idx) => (
                      <button key={idx} onClick={() => handleReactGroup(message._id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
        <ImageModal open={!!selectedImage} src={selectedImage} onClose={() => setSelectedImage(null)} />
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
        <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files[0]; if (f && f.size > 25 * 1024 * 1024) { alert('File size must be less than 25MB'); return; } setSelectedFile(f); }} style={{ display: 'none' }} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
        {selectedFile && (
          <div style={{ fontSize: 13, color: lightTheme ? '#0C4A6E' : '#60A5FA', marginRight: 8 }}>
            📎 {selectedFile.name}
          </div>
        )}
        <IconButton onClick={() => fileInputRef.current?.click()} title="Attach File">
          <AttachFileIcon />
        </IconButton>
        <IconButton onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="Add Emoji">
          <EmojiEmotionsIcon />
        </IconButton>
        <IconButton
          onClick={sendMessage}
          disabled={!messageContent.trim() && !selectedFile}
          sx={{
            backgroundColor: (messageContent.trim() || selectedFile) ? "#0084FF" : "#D1D5DB",
            color: "white",
            padding: "12px",
            borderRadius: "50%",
            transition: "all 0.3s ease",
            boxShadow: (messageContent.trim() || selectedFile) ? "0 2px 8px rgba(0, 132, 255, 0.3)" : "none",
            "&:hover": {
              backgroundColor: (messageContent.trim() || selectedFile) ? "#0073E6" : "#D1D5DB",
              transform: (messageContent.trim() || selectedFile) ? "scale(1.05)" : "none",
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
