import React, { useEffect } from "react";

function ImageModal({ open, src, alt, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 20,
      }}
    >
      <img
        src={src}
        alt={alt || "Image Preview"}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          borderRadius: 8,
          boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          background: "transparent",
          border: "none",
          color: "white",
          fontSize: 28,
          cursor: "pointer",
        }}
        aria-label="Close image preview"
      >
        ×
      </button>
    </div>
  );
}

export default ImageModal;
