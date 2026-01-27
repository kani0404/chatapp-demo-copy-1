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

  return (
    <div className="self-message-container">
      <div className="messageBox" style={{display: "flex", flexDirection: "column", gap: "8px"}}>
        {props.content && (
          <p style={{ color: "black" }}>{props.content}</p>
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
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              />
            ) : (
              <div
                onClick={() => downloadFile(props.file.base64, props.file.originalName, props.file.mimeType)}
                style={{
                  backgroundColor: "#e5e7eb",
                  color: "#000",
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
                  border: "2px solid #9ca3af",
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#d1d5db"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#e5e7eb"}
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
