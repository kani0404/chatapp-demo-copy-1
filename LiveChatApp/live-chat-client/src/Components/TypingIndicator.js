import React from "react";
import "./myStyles.css";

function TypingIndicator({ userName }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginBottom: "12px",
    }}>
      <div className="typing-indicator">
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
        <div className="typing-dot"></div>
      </div>
      <span style={{
        fontSize: "12px",
        color: "#9CA3AF",
        marginLeft: "6px",
      }}>
        {userName} is typing...
      </span>
    </div>
  );
}

export default TypingIndicator;
