import React, { useState, useEffect } from "react";
import axios from "axios";

const LastSeenDisplay = ({ userId, userName, token }) => {
  const [status, setStatus] = useState({
    isOnline: false,
    lastSeen: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserStatus();
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchUserStatus, 5000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchUserStatus = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
      const response = await axios.get(
        `http://localhost:8080/user/lastSeen/${userId}`,
        config
      );
      setStatus({
        isOnline: response.data.isOnline,
        lastSeen: response.data.lastSeen,
      });
      setLoading(false);
    } catch (error) {
      console.error("Error fetching user status:", error);
      setLoading(false);
    }
  };

  const formatLastSeen = (date) => {
    if (!date) return "Never";

    const now = new Date();
    const lastSeenDate = new Date(date);
    const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  if (loading) {
    return <span style={{ color: "rgba(240, 242, 245, 0.5)", fontSize: "12px" }}>Loading...</span>;
  }

  return (
    <span
      style={{
        color: status.isOnline ? "#06b6d4" : "rgba(240, 242, 245, 0.5)",
        fontSize: "12px",
        fontWeight: "500",
      }}
    >
      {status.isOnline ? (
        <>
          <span
            style={{
              display: "inline-block",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#06b6d4",
              marginRight: "4px",
            }}
          />
          Online
        </>
      ) : (
        `Last seen ${formatLastSeen(status.lastSeen)}`
      )}
    </span>
  );
};

export default LastSeenDisplay;
