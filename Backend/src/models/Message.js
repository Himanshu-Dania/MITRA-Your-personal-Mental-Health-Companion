const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
  {
    // Matches Conversation.sessionId  —  "userId_sessionId"
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'companion'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    emotion: [String],
    strategyUsed: [String],
    // Stores tool calls made by the agent: { toolName: { name, args, result } }
    toolCalls: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ragSources: [String],
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
