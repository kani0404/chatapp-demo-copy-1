import React, { useContext, useEffect, useRef, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import MessageSelf from "./MessageSelf";
import MessageOthers from "./MessageOthers";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import Skeleton from "@mui/material/Skeleton";
import axios from "axios";
import { myContext } from "./MainContainer";
import io from "socket.io-client";
import { SocketContext } from "./SocketContext";
import { useContext as useCtx } from "react"; 
import emojis from "./emojiList";

function ChatArea() {
  const lightTheme = useSelector((state) => state.themeKey);
  const [messageContent, setMessageContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Insert emoji into input (used by emoji buttons)
  const handleReact = (emoji) => {
    setMessageContent((prev) => prev + emoji);
  };

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const dyParams = useParams();
  const navigate = useNavigate();
  const [chat_id, chat_user] = dyParams._id.split("&");
  // console.log(chat_id, chat_user);
  const userData = JSON.parse(localStorage.getItem("userData"));
  const [allMessages, setAllMessages] = useState([]);
  const [otherUserId, setOtherUserId] = useState(null);
  const { socket, onlineUsers } = useCtx(SocketContext);
  // console.log("Chat area id : ", chat_id._id);
  // const refresh = useSelector((state) => state.refreshKey);
  const { refresh, setRefresh } = useContext(myContext);
  const [loaded, setloaded] = useState(false);

  // emoji list imported from shared emojiList

  const deleteChat = () => {
    const config = {
      headers: {
        Authorization: `Bearer ${userData.data.token}`,
      },
    };
    axios
      .delete(`http://localhost:8080/chat/${chat_id}`, config)
      .then(() => {
        console.log("Chat deleted successfully");
        setRefresh(!refresh);
        navigate("/app/welcome");
      })
      .catch((error) => {
        console.error("Error deleting chat:", error);
      });
  };

  const handleDeleteMessage = (messageId) => {
    const config = {
      headers: {
        Authorization: `Bearer ${userData.data.token}`,
      },
    };
    axios
      .delete(`http://localhost:8080/message/${messageId}`, config)
      .then(() => {
        console.log("Message deleted successfully");
        setAllMessages(allMessages.filter(msg => msg._id !== messageId));
      })
      .catch((error) => {
        console.error("Error deleting message:", error);
      });
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 25MB)
      if (file.size > 25 * 1024 * 1024) {
        alert("File size must be less than 25MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const sendMessage = async () => {
    if (!messageContent.trim() && !selectedFile) return;

    const tokenHeader = {
      headers: { Authorization: `Bearer ${userData.data.token}` },
    };

    // Keep a local reference to the file before clearing state
    const fileToUpload = selectedFile;

    let fileData = null;
    if (fileToUpload) {
      try {
        const base64 = await convertFileToBase64(fileToUpload);
        fileData = {
          originalName: fileToUpload.name,
          mimeType: fileToUpload.type,
          size: fileToUpload.size,
          base64,
        };
      } catch (error) {
        console.error("Error converting file:", error);
        return;
      }
    }

    const newMessage = {
      _id: Date.now(),
      sender: { _id: userData.data._id, name: userData.data.name },
      content: messageContent,
      file: fileData,
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI
    setAllMessages((prev) => [...prev, newMessage]);
    setMessageContent("");
    setSelectedFile(null);

    try {
      if (fileToUpload) {
        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("content", newMessage.content);
        formData.append("chatId", chat_id);

        const { data } = await axios.post("http://localhost:8080/message/", formData, tokenHeader);

        // Replace temp message with server response
        setAllMessages((prev) => prev.map((m) => (m._id === newMessage._id ? data : m)));
      } else {
        const { data } = await axios.post(
          "http://localhost:8080/message/",
          {
            content: newMessage.content,
            chatId: chat_id,
          },
          tokenHeader
        );

        // Replace temp message with server response
        setAllMessages((prev) => prev.map((m) => (m._id === newMessage._id ? data : m)));
      }

      console.log("Message Fired");
    } catch (error) {
      console.error("Error sending message:", error);
      console.error("Server response:", error.response?.data);
      setAllMessages((prev) => prev.filter((m) => m._id !== newMessage._id));
    }
  };

  // Handler to toggle reaction on a message (moved to component scope)
  const handleMessageReact = async (messageId, emoji, isGroup = false) => {
    const config = { headers: { Authorization: `Bearer ${userData.data.token}` } };
    try {
      const url = isGroup ? `http://localhost:8080/group/message/${messageId}/react` : `http://localhost:8080/message/${messageId}/react`;
      const { data } = await axios.post(url, { emoji }, config);
      // Update our local state with server response
      setAllMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
    } catch (error) {
      console.error('Error reacting to message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    console.log("Users refreshed");
    const config = {
      headers: {
        Authorization: `Bearer ${userData.data.token}`,
      },
    };
    axios
      .get("http://localhost:8080/message/" + chat_id, config)
      .then(async ({ data }) => {
        setAllMessages(data);
        setloaded(true);
        // Try to determine other user from chat users in messages
        if (data && data.length > 0 && data[0].chat && data[0].chat.users) {
          const other = data[0].chat.users.find((u) => u._id !== userData.data._id);
          if (other) setOtherUserId(other._id);
        } else {
          // If there are no messages yet, fetch chats and find the conversation
          try {
            const { data: chats } = await axios.get('http://localhost:8080/chat/', config);
            const convo = chats.find((c) => c._id === chat_id);
            if (convo && convo.users) {
              const other = convo.users.find((u) => u._id !== userData.data._id);
              if (other) setOtherUserId(other._id);
            }
          } catch (err) {
            console.error('Error fetching chat info:', err);
          }
        }
      });
  }, [refresh, chat_id, userData.data.token]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [allMessages]);

  // Socket.io listeners for message status updates
  useEffect(() => {
    const socket = io("http://localhost:8080", {
      query: { userId: userData.data._id },
    });

    // Ensure server knows this user is online (joins user room)
    socket.on('connect', () => {
      socket.emit('user_online', userData.data._id);
    });

    // Listen for message delivered status
    socket.on("message_delivered", (data) => {
      console.log("Message delivered:", data.messageId);
      setAllMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === data.messageId ? { ...msg, status: "delivered" } : msg
        )
      );
    });

    // Listen for message read status
    socket.on("message_read", (data) => {
      console.log("Message read:", data.messageId);
      setAllMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === data.messageId ? { ...msg, status: "read" } : msg
        )
      );
    });

    // Listen for message reaction updates
    socket.on("message_reaction_updated", (data) => {
      // 'data' is the updated message object
      setAllMessages((prev) => prev.map((m) => (m._id === data._id ? data : m)));
    });

    // Listen for user status changes
    socket.on("user_status_changed", (data) => {
      console.log("User status changed:", data);
      // You can update user online status here if needed
    });

      // Mark received messages as read when viewing the chat
    allMessages.forEach((msg) => {
      if (msg.sender._id !== userData.data._id && msg.status !== "read") {
        socket.emit("message_read", { messageId: msg._id });
        axios.post(
          "http://localhost:8080/message/read/mark",
          { messageId: msg._id },
          {
            headers: {
              Authorization: `Bearer ${userData.data.token}`,
            },
          }
        ).catch((error) => console.error("Error marking message as read:", error));
      }
    });

    // Note: we rely on the server socket emission to broadcast reaction updates to all clients



    return () => {
      socket.disconnect();
    };
  }, [userData.data._id, allMessages, userData.data.token]);

  if (!loaded) {
    return (
      <div
        style={{
          border: "20px",
          padding: "10px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <Skeleton
          variant="rectangular"
          sx={{ width: "100%", borderRadius: "10px" }}
          height={60}
        />
        <Skeleton
          variant="rectangular"
          sx={{
            width: "100%",
            borderRadius: "10px",
            flexGrow: "1",
          }}
        />
        <Skeleton
          variant="rectangular"
          sx={{ width: "100%", borderRadius: "10px" }}
          height={60}
        />
      </div>
    );
  } else {
    return (
      <div className={"chatArea-container" + (lightTheme ? "" : " dark")}>
        <div className={"chatArea-header" + (lightTheme ? "" : " dark")} style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "14px 20px",
          borderBottom: "2px solid " + (lightTheme ? "#E5E7EB" : "rgba(255,255,255,0.1)"),
          backgroundColor: lightTheme ? "#FFFFFF" : "#0F172A",
        }}>
          <div style={{
            position: "relative",
            width: "48px",
            height: "48px",
          }}>
            <div className={"con-icon" + (lightTheme ? "" : " dark")} style={{
              fontSize: "20px",
              margin: "0",
            }}>
              {chat_user[0].toUpperCase()}
            </div>
            <div style={{
              width: "12px",
              height: "12px",
              backgroundColor: (otherUserId && onlineUsers && onlineUsers[otherUserId]?.isOnline) ? "#22c55e" : "#9CA3AF",
              borderRadius: "50%",
              position: "absolute",
              bottom: "0",
              right: "0",
              border: "2px solid " + (lightTheme ? "#FFFFFF" : "#0F172A"),
              boxShadow: (otherUserId && onlineUsers && onlineUsers[otherUserId]?.isOnline) ? "0 0 6px rgba(34, 197, 94, 0.5)" : "none",
            }}></div>
          </div>
          <div className={"header-text" + (lightTheme ? "" : " dark")} style={{
            flex: 1,
          }}>
            <p className={"con-title" + (lightTheme ? "" : " dark")} style={{
              margin: "0 0 4px 0",
              fontSize: "18px",
              fontWeight: "700",
              textTransform: "capitalize",
              color: lightTheme ? "#1F2937" : "#E5E7EB",
            }}>
              {chat_user}
            </p>
            <p style={{
              margin: "0",
              fontSize: "12px",
              color: (otherUserId && onlineUsers && onlineUsers[otherUserId]?.isOnline) ? (lightTheme ? "#6B7280" : "#22c55e") : (lightTheme ? "#6B7280" : "#9CA3AF"),
              fontWeight: "500",
            }}>
              {otherUserId && onlineUsers && onlineUsers[otherUserId]?.isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
          <IconButton 
            className={"icon" + (lightTheme ? "" : " dark")}
            onClick={deleteChat}
            title="Delete Chat"
            sx={{
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "scale(1.1)",
              },
            }}
          >
            <DeleteIcon />
          </IconButton>
        </div>
        <div className={"messages-container" + (lightTheme ? "" : " dark")}>
          {allMessages.map((message, index) => {
              const sender = message.sender;
              const self_id = userData.data._id;
              if (sender._id === self_id) {
                // console.log("I sent it ");
                return <MessageSelf props={message} key={index} onDelete={handleDeleteMessage} onReact={handleMessageReact} />;
              } else {
                // console.log("Someone Sent it");
                return <MessageOthers props={message} key={index} onReact={handleMessageReact} />;
              }
            })}
          <div ref={messagesEndRef} className="BOTTOM" />
        </div>
        <div className={"text-input-area" + (lightTheme ? "" : " dark")}>
          <div style={{display: "flex", alignItems: "center", gap: "8px", flex: 1}}>
            <input
              placeholder="Type a Message"
              className={"search-box" + (lightTheme ? "" : " dark")}
              value={messageContent}
              onChange={(e) => {
                setMessageContent(e.target.value);
              }}
              onKeyDown={(event) => {
                if (event.code == "Enter") {
                  // console.log(event);
                  sendMessage();
                }
              }}
            />
            {selectedFile && (
              <div style={{
                padding: "6px 12px",
                backgroundColor: lightTheme ? "#DBEAFE" : "#1E293B",
                color: lightTheme ? "#0C4A6E" : "#60A5FA",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600",
                maxWidth: "150px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                📎 {selectedFile.name}
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: "none" }}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          />
          <IconButton
            className={"icon" + (lightTheme ? "" : " dark")}
            onClick={() => {
              fileInputRef.current.click();
            }}
            title="Attach File"
          >
            <AttachFileIcon />
          </IconButton>
          <IconButton
            className={"icon" + (lightTheme ? "" : " dark")}
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
            }}
            title="Add Emoji"
          >
            <EmojiEmotionsIcon />
          </IconButton>
          <IconButton
            className={"icon" + (lightTheme ? "" : " dark")}
            onClick={() => {
              sendMessage();
            }}
          >
            <SendIcon />
          </IconButton>
          {showEmojiPicker && (
            <div className="emoji-picker">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  className="emoji-btn"
                  onClick={() => {
                    handleReact(emoji);
                    setShowEmojiPicker(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
}

export default ChatArea;
