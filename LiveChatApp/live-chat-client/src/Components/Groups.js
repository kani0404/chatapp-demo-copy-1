import React, { useContext, useEffect, useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import { IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { myContext } from "./MainContainer";
import { motion, AnimatePresence } from "framer-motion";
import "./myStyles.css";

function Groups() {
  const { refresh, setRefresh } = useContext(myContext);
  const darkTheme = true; // Use dark elegant theme
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
      flex: "0.75",
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "linear-gradient(135deg, rgba(10, 14, 39, 0.6) 0%, rgba(26, 38, 71, 0.4) 100%)",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, rgba(18, 23, 47, 0.98) 0%, rgba(26, 38, 71, 0.98) 100%)",
        backdropFilter: "blur(15px)",
        borderBottom: "1px solid rgba(99, 102, 241, 0.2)",
        padding: "16px 20px",
        margin: "14px",
        borderRadius: "18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 8px 32px rgba(99, 102, 241, 0.15)",
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconButton onClick={() => nav(-1)} title="Back" sx={{ color: '#f0f2f5' }}>
            <ArrowBackIosNewIcon />
          </IconButton>
          <h2 style={{
            margin: "0",
            fontSize: "18px",
            fontWeight: "700",
            color: "#f0f2f5",
            letterSpacing: "0.3px",
          }}>
            Groups
          </h2>
        </div>
        <IconButton
          onClick={() => setRefresh(!refresh)}
          sx={{
            color: "#f0f2f5",
            "&:hover": {
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              transform: "rotate(180deg)",
              transition: "all 0.3s ease",
            },
          }}
        >
          <RefreshIcon />
        </IconButton>
      </div>

      {/* Search Bar */}
      <div style={{
        background: "transparent",
        padding: "0 14px",
        marginBottom: "8px",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: "linear-gradient(135deg, rgba(18, 23, 47, 0.98) 0%, rgba(26, 38, 71, 0.98) 100%)",
          backdropFilter: "blur(15px)",
          borderRadius: "18px",
          padding: "10px 16px",
          border: "1px solid rgba(99, 102, 241, 0.2)",
          boxShadow: "0 6px 24px rgba(99, 102, 241, 0.1)",
        }}>
          <SearchIcon sx={{ color: "#f0f2f5", fontSize: "20px", opacity: 0.7 }} />
          <input
            placeholder="Search groups..."
            style={{
              border: "none",
              backgroundColor: "transparent",
              outline: "none",
              fontSize: "14px",
              flex: 1,
              color: "#f0f2f5",
              fontFamily: '"Inter", "Segoe UI", sans-serif',
            }}
          />
        </div>
      </div>

      {/* Groups List */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "0 8px",
        background: "transparent",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(99, 102, 241, 0.4) transparent",
      }}>
        {loading ? (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: "#8a91a5",
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
            color: "#8a91a5",
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
                className="group-item list-item"
                style={{
                  margin: "8px 12px",
                  padding: "14px 18px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  background: "linear-gradient(135deg, rgba(18, 23, 47, 0.9) 0%, rgba(26, 38, 71, 0.9) 100%)",
                  border: "1px solid rgba(99, 102, 241, 0.15)",
                  cursor: "pointer",
                  transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(26, 38, 71, 0.9) 100%)";
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.4)";
                  e.currentTarget.style.transform = "translateX(6px)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, rgba(18, 23, 47, 0.9) 0%, rgba(26, 38, 71, 0.9) 100%)";
                  e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.15)";
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                {/* Group Avatar */}
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "18px",
                  fontWeight: "700",
                  boxShadow: "0 6px 20px rgba(99, 102, 241, 0.45)",
                  flexShrink: 0,
                  fontFamily: '"Inter", sans-serif',
                }}>
                  {group.groupName.charAt(0).toUpperCase()}
                </div>

                {/* Group Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    margin: "0 0 4px 0",
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#f0f2f5",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {group.groupName}
                  </h4>
                  <p style={{
                    margin: "0",
                    fontSize: "13px",
                    color: "#8a91a5",
                    fontWeight: "500",
                  }}>
                    {group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Last Message Preview */}
                {group.latestMessage && (
                  <div style={{
                    fontSize: "12px",
                    color: "#7a8195",
                    textAlign: "right",
                    maxWidth: "120px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontWeight: "500",
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
