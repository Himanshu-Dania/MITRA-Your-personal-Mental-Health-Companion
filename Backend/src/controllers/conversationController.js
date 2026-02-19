const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

// @desc    Create a new conversation
// @route   POST /api/conversations
// @access  Private
const createConversation = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { title } = req.body;
        const conv = await Conversation.create({
            userId,
            title: title || "New Conversation",
        });
        res.status(201).json(conv);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all conversations for the logged-in user (newest first)
// @route   GET /api/conversations
// @access  Private
const getConversations = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const conversations = await Conversation.find({ userId })
            .sort({ lastMessageAt: -1, createdAt: -1 })
            .lean();
        res.json(conversations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Get all messages for a conversation (owned by caller)
// @route   GET /api/conversations/:id/messages
// @access  Private
const getMessages = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const conv = await Conversation.findOne({ _id: req.params.id, userId });
        if (!conv)
            return res.status(404).json({ message: "Conversation not found" });

        // conversationId in messages is stored as the conversation's _id string
        const messages = await Message.find({
            conversationId: conv._id.toString(),
        })
            .sort({ createdAt: 1 })
            .lean();
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete a conversation and all its messages
// @route   DELETE /api/conversations/:id
// @access  Private
const deleteConversation = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const conv = await Conversation.findOneAndDelete({
            _id: req.params.id,
            userId,
        });
        if (!conv)
            return res.status(404).json({ message: "Conversation not found" });

        await Message.deleteMany({ conversationId: conv._id.toString() });
        res.json({ message: "Conversation deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    createConversation,
    getConversations,
    getMessages,
    deleteConversation,
};
