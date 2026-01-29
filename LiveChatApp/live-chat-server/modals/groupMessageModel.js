const mongoose = require("mongoose");

const groupMessageSchema = mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    file: {
      originalName: String,
      mimeType: String,
      size: Number,
      base64: String,
      url: String,
    },
    reactions: [
      {
        emoji: String,
        users: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        ],
      },
    ],
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const GroupMessage = mongoose.model("GroupMessage", groupMessageSchema);
module.exports = GroupMessage;
