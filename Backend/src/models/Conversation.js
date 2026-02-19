const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema(
    {
        // userId stored as String to accept both ObjectId and legacy string IDs
        userId: {
            type: String,
            required: true,
            index: true,
        },
        title: {
            type: String,
            default: "New Conversation",
        },
        lastMessageAt: {
            type: Date,
        },
    },
    { timestamps: true },
);

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;
