const mongoose = require("mongoose");

const journalSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        title: {
            type: String,
            default: "",
        },
        content: {
            type: String,
            required: true,
        },
        // Linked task (only for journal-type tasks — marks task progress when saved)
        taskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            default: null,
        },
        // Optional semantic embedding (sentence-transformers/all-mpnet-base-v2, 768-dim)
        embedding: {
            type: [Number],
            default: undefined,
        },
    },
    { timestamps: true },
);

const Journal = mongoose.model("Journal", journalSchema);
module.exports = Journal;
