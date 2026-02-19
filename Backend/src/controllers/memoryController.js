const Memory = require('../models/Memory');
const mongoose = require('mongoose');

// @desc    Get all memories for the logged-in user
// @route   GET /api/memories
// @access  Private
const getMemories = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const memories = await Memory.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json(memories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a memory manually
// @route   POST /api/memories
// @access  Private
const createMemory = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { content, memoryType = 'info' } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'content is required' });
    }
    if (!['instruct', 'info'].includes(memoryType)) {
      return res.status(400).json({ message: 'memoryType must be "instruct" or "info"' });
    }
    const memory = await Memory.create({
      userId,
      conversationId: null,   // manually created, not tied to a conversation
      memoryType,
      content: content.trim(),
    });
    res.status(201).json(memory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update a memory's content or type
// @route   PUT /api/memories/:id
// @access  Private
const updateMemory = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid memory id' });
    }

    const memory = await Memory.findOne({ _id: id, userId });
    if (!memory) {
      return res.status(404).json({ message: 'Memory not found' });
    }

    const { content, memoryType } = req.body;
    if (content !== undefined) {
      if (!content.trim()) return res.status(400).json({ message: 'content cannot be empty' });
      memory.content = content.trim();
      // Clear stale embedding when content changes
      memory.embedding = [];
    }
    if (memoryType !== undefined) {
      if (!['instruct', 'info'].includes(memoryType)) {
        return res.status(400).json({ message: 'memoryType must be "instruct" or "info"' });
      }
      memory.memoryType = memoryType;
    }

    const updated = await memory.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a memory
// @route   DELETE /api/memories/:id
// @access  Private
const deleteMemory = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid memory id' });
    }

    const result = await Memory.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Memory not found' });
    }
    res.json({ message: 'Memory deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getMemories, createMemory, updateMemory, deleteMemory };
