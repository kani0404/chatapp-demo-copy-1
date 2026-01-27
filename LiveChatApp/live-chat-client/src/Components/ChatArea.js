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

function ChatArea() {
  const lightTheme = useSelector((state) => state.themeKey);
  const [messageContent, setMessageContent] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const dyParams = useParams();
  const navigate = useNavigate();
  const [chat_id, chat_user] = dyParams._id.split("&");
  // console.log(chat_id, chat_user);
  const userData = JSON.parse(localStorage.getItem("userData"));
  const [allMessages, setAllMessages] = useState([]);
  // console.log("Chat area id : ", chat_id._id);
  // const refresh = useSelector((state) => state.refreshKey);
  const { refresh, setRefresh } = useContext(myContext);
  const [loaded, setloaded] = useState(false);

  const emojis = [
    "😀", "😂", "😍", "😘", "🤔", "😎", "🤗", "😉", "👍", "👏",
    "🎉", "🔥", "💯", "❤️", "😢", "😡", "🤮", "😴", "👋", "🙏",
    "😆", "😅", "😄", "😃", "😁", "😜", "😝", "😒", "😌", "😔",
    "😖", "😕", "😨", "😱", "😳", "😵", "😲", "😞", "😓", "😩",
    "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤐", "🤑", "🤓", "😏",
    "😬", "🙁", "😼", "😻", "😹", "😺", "😸", "😽", "😾", "😿",
    "🙀", "🙈", "🙉", "🙊", "💪", "👊", "✊", "👏", "🙌", "👐",
    "🤲", "🤜", "🤛", "🙏", "💔", "💕", "💖", "💗", "💘", "💝",
    "💟", "🔥", "⭐", "✨", "💫", "🌟", "⚡", "💥", "🎊", "🎉",
    "🎈", "🎀", "🎁", "🎂", "🍕", "🍔", "🍟", "🌭", "🍿", "🥤"
  ];

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
    // console.log("SendMessage Fired to", chat_id._id);
    if (!messageContent.trim() && !selectedFile) return;

    const config = {
      headers: {
        Authorization: `Bearer ${userData.data.token}`,
      },
    };

    // Save content before clearing
    const tempContent = messageContent;
    let fileData = null;

    if (selectedFile) {
      try {
        const base64 = await convertFileToBase64(selectedFile);
        fileData = {
          originalName: selectedFile.name,
          mimeType: selectedFile.type,
          size: selectedFile.size,
          base64: base64,
        };
      } catch (error) {
        console.error("Error converting file:", error);
        return;
      }
    }

    // Create message object to show immediately
    const newMessage = {
      _id: Date.now(),
      sender: { _id: userData.data._id, name: userData.data.name },
      content: tempContent,
      file: fileData,
      createdAt: new Date().toISOString(),
    };

    // Add message to state immediately for instant display
    setAllMessages([...allMessages, newMessage]);
    setMessageContent("");
    setSelectedFile(null);

    // Send to server
    axios
      .post(
        "http://localhost:8080/message/",
        {
          content: tempContent,
          chatId: chat_id,
          file: fileData,
        },
        config
      )
      .then(({ data }) => {
        console.log("Message Fired");
      })
      .catch((error) => {
        console.error("Error sending message:", error);
        // Remove temporary message if sending fails
        setAllMessages(allMessages.filter(m => m._id !== newMessage._id));
      });
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
      .then(({ data }) => {
        setAllMessages(data);
        setloaded(true);
        // console.log("Data from Acess Chat API ", data);
      });
  }, [refresh, chat_id, userData.data.token]);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [allMessages]);

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
              backgroundColor: "#22c55e",
              borderRadius: "50%",
              position: "absolute",
              bottom: "0",
              right: "0",
              border: "2px solid " + (lightTheme ? "#FFFFFF" : "#0F172A"),
              boxShadow: "0 0 6px rgba(34, 197, 94, 0.5)",
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
              color: lightTheme ? "#6B7280" : "#22c55e",
              fontWeight: "500",
            }}>
              🟢 Online
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
                return <MessageSelf props={message} key={index} />;
              } else {
                // console.log("Someone Sent it");
                return <MessageOthers props={message} key={index} />;
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
                    setMessageContent(messageContent + emoji);
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
