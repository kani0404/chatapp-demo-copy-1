import React, { useContext, useEffect, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { myContext } from "./MainContainer";
import { motion, AnimatePresence } from "framer-motion";
import "./myStyles.css";

function Groups() {
  const { refresh, setRefresh } = useContext(myContext);
  const lightTheme = true; // Force light theme for professional look
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const userData = JSON.parse(localStorage.getItem("userData"));
  const nav = useNavigate();

  if (!userData) {
    console.log("User not Authenticated");
    nav("/");
  }

  const user = userData.data;

  useEffect(() => {
    setLoading(true);
    const config = {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    };

    axios
      .get("http://localhost:8080/group/", config)
      .then((response) => {
        console.log("Group Data from API ", response.data);
        setGroups(response.data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching groups:", error);
        setLoading(false);
      });
  }, [refresh, user.token]);

  return (
    <div style={{
      flex: "0.7",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      backgroundColor: lightTheme ? "#FFFFFF" : "#0F172A",
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: lightTheme ? "#F9FAFB" : "#111827",
        borderBottom: "1px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
        padding: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
      }}>
        <h2 style={{
          margin: "0",
          fontSize: "18px",
          fontWeight: "600",
          color: lightTheme ? "#1F2937" : "#E5E7EB",
        }}>
          Groups
        </h2>
        <IconButton
          onClick={() => setRefresh(!refresh)}
          sx={{
            color: lightTheme ? "#6B7280" : "#9CA3AF",
            "&:hover": {
              backgroundColor: lightTheme ? "#F3F4F6" : "#1F2937",
            },
          }}
        >
          <RefreshIcon />
        </IconButton>
      </div>

      {/* Search Bar */}
      <div style={{
        backgroundColor: lightTheme ? "#FFFFFF" : "#111827",
        borderBottom: "1px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
        padding: "12px 16px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: lightTheme ? "#F3F4F6" : "#1F2937",
          borderRadius: "24px",
          padding: "8px 12px",
          border: "1px solid " + (lightTheme ? "#D1D5DB" : "#374151"),
        }}>
          <SearchIcon sx={{ color: lightTheme ? "#9CA3AF" : "#6B7280", fontSize: "20px" }} />
          <input
            placeholder="Search groups..."
            style={{
              border: "none",
              backgroundColor: "transparent",
              outline: "none",
              fontSize: "14px",
              flex: 1,
              color: lightTheme ? "#1F2937" : "#E5E7EB",
            }}
          />
        </div>
      </div>

      {/* Groups List */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px",
        backgroundColor: lightTheme ? "#FFFFFF" : "#0F172A",
        scrollbarWidth: "thin",
        scrollbarColor: lightTheme ? "#D1D5DB #FFFFFF" : "#4B5563 #0F172A",
      }}>
        {loading ? (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: lightTheme ? "#9CA3AF" : "#6B7280",
          }}>
            <p>Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: lightTheme ? "#9CA3AF" : "#6B7280",
            gap: "12px",
          }}>
            <p style={{ fontSize: "14px" }}>No groups yet</p>
            <p style={{ fontSize: "12px" }}>Create a new group to get started</p>
          </div>
        ) : (
          <AnimatePresence>
            {groups.map((group, index) => (
              <motion.div
                key={group._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => nav(`/app/group/${group._id}`)}
                className="group-item"
                style={{
                  backgroundColor: lightTheme ? "#F9FAFB" : "#1F2937",
                  border: "1px solid " + (lightTheme ? "#E5E7EB" : "#374151"),
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = lightTheme ? "#F0F9FF" : "#374151";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 123, 255, 0.2)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = lightTheme ? "#F9FAFB" : "#1F2937";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {/* Group Avatar */}
                <div className="group-avatar">
                  {group.groupName.charAt(0).toUpperCase()}
                </div>

                {/* Group Info */}
                <div style={{ flex: 1, marginLeft: "12px" }}>
                  <h4 style={{
                    margin: "0 0 4px 0",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: lightTheme ? "#1F2937" : "#E5E7EB",
                  }}>
                    {group.groupName}
                  </h4>
                  <p style={{
                    margin: "0",
                    fontSize: "13px",
                    color: lightTheme ? "#9CA3AF" : "#6B7280",
                  }}>
                    {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Last Message Preview */}
                {group.latestMessage && (
                  <div style={{
                    fontSize: "12px",
                    color: lightTheme ? "#6B7280" : "#9CA3AF",
                    textAlign: "right",
                    maxWidth: "100px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {group.latestMessage.content}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

export default Groups;
