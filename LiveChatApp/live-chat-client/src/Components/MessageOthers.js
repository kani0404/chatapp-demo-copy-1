import React from "react";
import "./myStyles.css";
import { useDispatch, useSelector } from "react-redux";

function MessageOthers({ props }) {
  const dispatch = useDispatch();
  const lightTheme = useSelector((state) => state.themeKey);
  // console.log("message others : ", props);

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
    <div style={{
      display: "flex",
      alignItems: "flex-end",
      gap: "8px",
      marginBottom: "16px",
    }}>
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        background: "linear-gradient(135deg, #3B82F6, #1E40AF)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "18px",
        fontWeight: "700",
        flexShrink: 0,
        boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)",
      }}>
        {props.sender.name[0].toUpperCase()}
      </div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        flex: 1,
      }}>
        <p style={{
          margin: "0",
          fontSize: "14px",
          fontWeight: "700",
          color: "#60a5fa",
          paddingLeft: "6px",
          textTransform: "capitalize",
          letterSpacing: "0.3px",
        }}>
          {props.sender.name}
        </p>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "70%",
        }}>
          {props.content && (
            <div style={{
              backgroundColor: "#dbeafe",
              color: "#0c4a6e",
              padding: "12px 16px",
              borderRadius: "18px",
              width: "fit-content",
              wordBreak: "break-word",
              lineHeight: "1.6",
              fontSize: "16px",
              fontWeight: "500",
              boxShadow: "0 2px 8px rgba(59, 130, 246, 0.2)",
              animation: "slideIn 0.3s ease-out",
            }}>
              {props.content}
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
                    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.2)",
                  }}
                />
              ) : (
                <div
                  onClick={() => downloadFile(props.file.base64, props.file.originalName, props.file.mimeType)}
                  style={{
                    backgroundColor: "#dbeafe",
                    color: "#0c4a6e",
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
                    border: "2px solid #60a5fa",
                    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.2)",
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#bfdbfe"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#dbeafe"}
                >
                  📎 {props.file.originalName}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MessageOthers;
