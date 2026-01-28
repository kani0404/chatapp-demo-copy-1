import React, { useState, useRef } from "react";
import { FiMic, FiX, FiSend } from "react-icons/fi";

const VoiceMessageRecorder = ({ onSend, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedData, setRecordedData] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = async () => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            blob: audioBlob,
            url: audioUrl,
            base64: reader.result,
            duration: recordingTime,
            mimeType: "audio/webm",
            size: audioBlob.size,
          });
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach((track) => {
          track.stop();
        });
      };

      mediaRecorder.stop();
      clearInterval(timerRef.current);
      setIsRecording(false);
    });
  };

  const handleStopAndSave = async () => {
    const data = await stopRecording();
    if (data) {
      setRecordedData(data);
    }
  };

  const handleSendVoice = () => {
    if (recordedData && onSend) {
      onSend(recordedData);
      setRecordedData(null);
      setRecordingTime(0);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => {
        track.stop();
      });
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
    setRecordedData(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Recording state
  if (isRecording) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          padding: "12px 16px",
          borderRadius: "24px",
          border: "1px solid #ef4444",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: "#ef4444",
              animation: "pulse 1s infinite",
            }}
          />
          <span style={{ color: "#ef4444", fontSize: "14px", fontWeight: "500" }}>
            Recording: {formatTime(recordingTime)}
          </span>
        </div>
        <button
          onClick={handleStopAndSave}
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            backgroundColor: "#06b6d4",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          Stop
        </button>
        <button
          onClick={handleCancel}
          style={{
            padding: "6px 12px",
            backgroundColor: "#6b7280",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  // Recorded state (playback/send)
  if (recordedData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          padding: "12px 16px",
          borderRadius: "24px",
          border: "1px solid #6366f1",
        }}
      >
        <audio
          controls
          style={{
            height: "32px",
            flex: 1,
          }}
          src={recordedData.url}
        />
        <button
          onClick={handleSendVoice}
          disabled={disabled}
          style={{
            padding: "8px 12px",
            backgroundColor: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: disabled ? "not-allowed" : "pointer",
            fontSize: "12px",
            fontWeight: "500",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          Send
        </button>
        <button
          onClick={handleCancel}
          style={{
            padding: "8px 12px",
            backgroundColor: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          Clear
        </button>
      </div>
    );
  }

  // Default state (mic button)
  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      title="Record voice message"
      style={{
        padding: "8px",
        backgroundColor: "transparent",
        border: "none",
        color: "#6366f1",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "20px",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <FiMic size={20} />
    </button>
  );
};

export default VoiceMessageRecorder;
