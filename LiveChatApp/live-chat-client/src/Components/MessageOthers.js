import React, { useState } from "react";
import "./myStyles.css";
import { useDispatch, useSelector } from "react-redux";
import ImageModal from "./ImageModal";

import emojis from './emojiList';

function MessageOthers({ props, onReact }) {
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

  const [openImage, setOpenImage] = useState(null);

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
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#f0f2f5",
        fontSize: "18px",
        fontWeight: "700",
        flexShrink: 0,
        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
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
          color: "#06b6d4",
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
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              color: "#f0f2f5",
              padding: "12px 16px",
              borderRadius: "18px",
              width: "fit-content",
              wordBreak: "break-word",
              lineHeight: "1.6",
              fontSize: "16px",
              fontWeight: "500",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
              animation: "slideIn 0.3s ease-out",
            }}>
              {props.content}
            </div>
          )}
          {props.file && (
            <div>
              {isImage(props.file.mimeType) ? (
                <img
                  src={props.file.url ? props.file.url : `data:${props.file.mimeType};base64,${props.file.base64}`}
                  alt="Shared"
                  onClick={() => setOpenImage(props.file.url ? props.file.url : `data:${props.file.mimeType};base64,${props.file.base64}`)}
                  style={{
                    maxWidth: "300px",
                    maxHeight: "300px",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)",
                    cursor: 'pointer',
                  }}
                />
              ) : (
                <div
                  onClick={() => {
                    if (props.file.url) {
                      window.open(props.file.url, '_blank');
                    } else {
                      downloadFile(props.file.base64, props.file.originalName, props.file.mimeType);
                    }
                  }}
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
                    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "rgba(99, 102, 241, 0.2)"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "rgba(99, 102, 241, 0.12)"}
                >
                  📎 {props.file.originalName}
                </div>
              )}
            </div>
          )}

          {/* Reactions */}
          {props.reactions && props.reactions.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center' }}>
              {props.reactions.map((r) => {
                const currentUserId = JSON.parse(localStorage.getItem('userData'))?.data?._id;
                const reacted = r.users && r.users.find((u) => (u._id ? u._id.toString() : u.toString()) === currentUserId);
                return (
                  <div
                    key={r.emoji}
                    onClick={() => onReact && onReact(props._id, r.emoji)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      background: reacted ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                      cursor: 'pointer',
                      color: '#f0f2f5',
                      fontWeight: 600,
                    }}
                  >
                    <span>{r.emoji}</span>
                    <span style={{ fontSize: '12px' }}>{r.users.length}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reaction picker button */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); const picker = e.currentTarget.nextSibling; if (picker) picker.style.display = picker.style.display === 'flex' ? 'none' : 'flex'; }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#06b6d4',
                fontSize: '18px',
                padding: '4px',
              }}
              title="React"
            >
              😄
            </button>
            <div style={{ display: 'none', gap: '6px', marginLeft: '8px', background: '#0F172A', padding: '8px', borderRadius: '8px' }}>
              {emojis.map((e, idx) => (
                <button key={idx} onClick={() => onReact && onReact(props._id, e)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ImageModal open={!!openImage} src={openImage} onClose={() => setOpenImage(null)} />
    </div>
  );
}

export default MessageOthers;
