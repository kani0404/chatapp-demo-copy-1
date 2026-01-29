import React, { useContext, useEffect, useState } from "react";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { IconButton } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import NightlightIcon from "@mui/icons-material/Nightlight";
import LightModeIcon from "@mui/icons-material/LightMode";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme } from "../Features/themeSlice";
import axios from "axios";
import { refreshSidebarFun } from "../Features/refreshSidebar";
import { myContext } from "./MainContainer";
import io from "socket.io-client";
import { SocketContext } from "./SocketContext";
import { useContext as useCtx } from "react";

function Sidebar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const lightTheme = useSelector((state) => state.themeKey);
  // const refresh = useSelector((state) => state.refreshKey);
  const { refresh, setRefresh } = useContext(myContext);
  console.log("Context API : refresh : ", refresh);
  const [conversations, setConversations] = useState([]);
  const [users, setUsers] = useState([]);
  // console.log("Conversations of Sidebar : ", conversations);
  const userData = JSON.parse(localStorage.getItem("userData"));
  // console.log("Data from LocalStorage : ", userData);
  const nav = useNavigate();
  if (!userData) {
    console.log("User not Authenticated");
    nav("/");
  }

  const user = userData.data;
  
  const { socket, onlineUsers } = useCtx(SocketContext);

  useEffect(() => {
    // When socket connects it will emit user_online from the provider
    // We don't need to create a separate socket here anymore
    // But if the component needs socket in future, it's available via context

    // Debug: show onlineUsers map when it updates
    console.log('Sidebar onlineUsers:', onlineUsers);
    return () => {};
  }, [socket, onlineUsers]);

  useEffect(() => {
    // console.log("Sidebar : ", user.token);
    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };

    // Wait for both API calls to complete before updating state
    Promise.all([
      axios.get("http://localhost:8080/chat/", config),
      axios.get("http://localhost:8080/user/fetchUsers", config),
    ])
      .then(([chatResponse, usersResponse]) => {
        console.log("Data refresh in sidebar ", chatResponse.data);
        console.log("UData refreshed in sidebar", usersResponse.data);
        setConversations(chatResponse.data);
        setUsers(usersResponse.data);
      })
      .catch((error) => {
        console.error("Error fetching sidebar data:", error);
      });
  }, [refresh]);

  return (
    <div className="sidebar-container">
      <div className={"sb-header" + (lightTheme ? "" : " dark")}>
        <div className="user-name-display">
          <p className={"user-name" + (lightTheme ? "" : " dark")}>
            {userData.data.name}
          </p>
        </div>
        <div className="other-icons">
          <IconButton
            onClick={() => {
              nav("/app/welcome");
            }}
          >
            <AccountCircleIcon
              className={"icon" + (lightTheme ? "" : " dark")}
            />
          </IconButton>

          <IconButton
            onClick={() => {
              navigate("users");
            }}
          >
            <PersonAddIcon className={"icon" + (lightTheme ? "" : " dark")} />
          </IconButton>
          <IconButton
            onClick={() => {
              navigate("groups");
            }}
          >
            <GroupAddIcon className={"icon" + (lightTheme ? "" : " dark")} />
          </IconButton>
          <IconButton
            onClick={() => {
              navigate("create-groups");
            }}
          >
            <AddCircleIcon className={"icon" + (lightTheme ? "" : " dark")} />
          </IconButton>

          <IconButton
            onClick={() => {
              dispatch(toggleTheme());
            }}
            sx={{
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "rotate(20deg)",
              },
            }}
          >
            {lightTheme && (
              <NightlightIcon
                className={"icon" + (lightTheme ? "" : " dark")}
              />
            )}
            {!lightTheme && (
              <LightModeIcon className={"icon" + (lightTheme ? "" : " dark")} />
            )}
          </IconButton>
          <IconButton
            onClick={() => {
              const config = {
                headers: {
                  Authorization: `Bearer ${user.token}`,
                },
              };
              axios
                .post("http://localhost:8080/user/logout", {}, config)
                .then(() => {
                  // Disconnect socket to ensure server receives disconnect and updates status
                  if (socket) {
                    try { socket.disconnect(); } catch (e) { /* ignore */ }
                  }
                  localStorage.removeItem("userData");
                  navigate("/");
                })
                .catch((error) => {
                  console.error("Logout error:", error);
                  if (socket) {
                    try { socket.disconnect(); } catch (e) { /* ignore */ }
                  }
                  localStorage.removeItem("userData");
                  navigate("/");
                });
            }}
          >
            <ExitToAppIcon className={"icon" + (lightTheme ? "" : " dark")} />
          </IconButton>
        </div>
      </div>
      <div className={"sb-search" + (lightTheme ? "" : " dark")}>
        <IconButton className={"icon" + (lightTheme ? "" : " dark")}>
          <SearchIcon />
        </IconButton>
        <input
          placeholder="Search"
          className={"search-box" + (lightTheme ? "" : " dark")}
        />
      </div>
      <div className={"sb-conversations" + (lightTheme ? "" : " dark")}>
        {/* Display Existing Conversations */}
        {conversations.map((conversation, index) => {
          // console.log("current convo : ", conversation);
          if (conversation.users.length === 1) {
            return <div key={index}></div>;
          }

          // Get the other user (not the logged-in user)
          const otherUser = conversation.users.find(
            (u) => u._id !== userData.data._id
          );

          if (!otherUser) {
            return <div key={index}></div>;
          }

          if (conversation.latestMessage === undefined || conversation.latestMessage === null) {
            // console.log("No Latest Message with ", otherUser);
            return (
              <div
                key={index}
                onClick={() => {
                  console.log("Refresh fired from sidebar");
                  // dispatch(refreshSidebarFun());
                  setRefresh(!refresh);
                }}
              >
                <div
                  key={index}
                  className="conversation-container"
                  onClick={() => {
                    navigate(
                      "chat/" +
                        conversation._id +
                        "&" +
                        otherUser.name
                    );
                  }}
                  // dispatch change to refresh so as to update chatArea
                >
                  <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                    {otherUser.name[0]}
                  </p>
                  <p className={"con-title" + (lightTheme ? "" : " dark")}>
                    {otherUser.name}
                    {process.env.NODE_ENV === 'development' && (
                      <div style={{ fontSize: '10px', color: '#6B7280' }}>
                        ID: {otherUser._id} Status: {JSON.stringify(onlineUsers && onlineUsers[otherUser._id])}
                      </div>
                    )}
                  </p>

                  <p className="con-lastMessage">
                    No previous Messages, click here to start a new chat
                  </p>

                  <p className="con-lastMessage">
                    No previous Messages, click here to start a new chat
                  </p>
                  {/* <p className={"con-timeStamp" + (lightTheme ? "" : " dark")}>
                {conversation.timeStamp}
              </p> */}
                </div>
              </div>
            );
          } else {
            return (
              <div
                key={index}
                className="conversation-container"
                onClick={() => {
                  navigate(
                    "chat/" +
                      conversation._id +
                      "&" +
                      otherUser.name
                  );
                }}
              >
                <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                  {otherUser.name[0]}
                </p>
                <p className={"con-title" + (lightTheme ? "" : " dark")}>
                  {otherUser.name}
                </p>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: (onlineUsers && onlineUsers[otherUser._id]?.isOnline) ? '#22c55e' : '#9CA3AF',
                  marginLeft: '8px'
                }} />

                <p className="con-lastMessage">
                  {conversation.latestMessage?.content || "No messages yet"}
                </p>
                {/* <p className={"con-timeStamp" + (lightTheme ? "" : " dark")}>
                {conversation.timeStamp}
              </p> */}
              </div>
            );
          }
        })}

        {/* Display Available Users */}
        {users
          .filter((u) => u._id !== userData.data._id)
          .filter((user) => {
            // Filter out users who already have conversations
            return !conversations.some((conv) =>
              conv.users.some((u) => u._id === user._id)
            );
          })
          .map((user, index) => {
            return (
              <div
                key={"user-" + index}
                className="conversation-container"
                onClick={() => {
                  console.log("Creating chat with ", user.name);
                  const config = {
                    headers: {
                      Authorization: `Bearer ${userData.data.token}`,
                    },
                  };
                  axios.post(
                    "http://localhost:8080/chat/",
                    {
                      userId: user._id,
                    },
                    config
                  );
                  setRefresh(!refresh);
                }}
              >
                <p className={"con-icon" + (lightTheme ? "" : " dark")}>
                  {user.name[0]}
                </p>
                <p className={"con-title" + (lightTheme ? "" : " dark")}>
                  {user.name}
                </p>
                <p className="con-lastMessage">Click to start chat</p>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default Sidebar;
