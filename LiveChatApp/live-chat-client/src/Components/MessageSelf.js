import React from "react";

function MessageSelf({ props }) {
  // console.log("Message self Prop : ", props);

  const isImage = (mimeType) => mimeType && mimeType.startsWith('image/');
  const isDocument = (mimeType) => {
    if (!mimeType) return false;
    const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
    return documentTypes.includes(mimeType);
  };

  const downloadFile = (base64, fileName, mimeType) => {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${base64}`;
    link.download = fileName;
    link.click();
  };

  // Message tick indicator component
  const MessageTicks = ({ status }) => {
    if (status === "sent") {
      return (
        <span style={{ color: "#06b6d4", fontSize: "12px", marginLeft: "4px" }}>
          ✓
        </span>
      );
    } else if (status === "delivered") {
      return (
        <span style={{ color: "#06b6d4", fontSize: "12px", marginLeft: "4px" }}>
          ✓✓
        </span>
      );
    } else if (status === "read") {
      return (
        <span style={{ color: "#a855f7", fontSize: "12px", marginLeft: "4px", fontWeight: "bold" }}>
          ✓✓
        </span>
      );
    }
    return null;
  };

  return (
    <div className="self-message-container">
      <div className="messageBox" style={{display: "flex", flexDirection: "column", gap: "8px"}}>
        {props.content && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
            <p style={{ color: "#f0f2f5", margin: 0 }}>{props.content}</p>
            <MessageTicks status={props.status} />
          </div>
        )}
        {props.file && (
          <div>
            {isImage(props.file.mimeType) ? (
              <img
                src={`data:${props.file.mimeType};base64,${props.file.base64}`}
                alt="Shared"
                style={{
                  maxWidth: "300px",
                  maxHeight: "300px",
                  borderRadius: "12px",
                  boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                }}
              />
            ) : (
              <div
                onClick={() => downloadFile(props.file.base64, props.file.originalName, props.file.mimeType)}
                style={{
                  backgroundColor: "rgba(99, 102, 241, 0.12)",
                  color: "#f0f2f5",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "fit-content",
                  fontSize: "14px",
                  fontWeight: "600",
                  transition: "background-color 0.2s ease",
                  border: "2px solid rgba(99, 102, 241, 0.2)",
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(99, 102, 241, 0.2)"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "rgba(99, 102, 241, 0.12)"}
              >
                📎 {props.file.originalName}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageSelf;
