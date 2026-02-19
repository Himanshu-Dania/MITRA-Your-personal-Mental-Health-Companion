const mongoose = require("mongoose");

/**
 * Two memory subtypes:
 *  - "instruct" : instruction/preference memories (no embedding needed)
 *  - "info"     : factual/biographical memories (embedding stored for semantic search)
 */
const memorySchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        // The conversation this memory was captured in (null for manually-added memories)
        conversationId: {
            type: String,
            default: null,
            index: true,
        },
        memoryType: {
            type: String,
            enum: ["instruct", "info"],
            required: true,
            default: "info",
        },
        content: {
            type: String,
            required: true,
        },
        // Only populated for "info" memories — sentence-transformers/all-mpnet-base-v2 (768-dim)
        embedding: {
            type: [Number],
            default: undefined,
        },
    },
    { timestamps: true },
);

const Memory = mongoose.model("Memory", memorySchema);
module.exports = Memory;
