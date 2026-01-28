// Voice Recording Utility
class VoiceRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        // Audio processing happens in stopRecording method
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      return true;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      return false;
    }
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Convert blob to base64 for sending to server
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result;
          const duration = this.getAudioDuration(audioBlob);

          resolve({
            blob: audioBlob,
            url: audioUrl,
            base64: base64data,
            duration: duration,
            mimeType: audioBlob.type,
            size: audioBlob.size,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach((track) => {
        track.stop();
      });

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  getAudioDuration(blob) {
    // Simplified: return approximate duration based on file size
    // In production, you'd want to analyze the audio more precisely
    const durationInSeconds = blob.size / 16000; // rough estimate
    return Math.round(durationInSeconds * 100) / 100;
  }

  cancelRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.isRecording = false;
    }
    this.audioChunks = [];
  }
}

export default VoiceRecorder;
