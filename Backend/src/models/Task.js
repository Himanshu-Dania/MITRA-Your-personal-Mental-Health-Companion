const mongoose = require("mongoose");

const taskSchema = mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        // The conversation that spawned this task (null for manually-created tasks)
        conversationId: {
            type: String,
            default: null,
            index: true,
        },
        taskName: {
            type: String,
            required: true,
        },
        taskType: {
            type: String,
            enum: ["discrete", "slider", "checkmark", "journal"],
            required: true,
            default: "checkmark",
        },
        description: String,
        reasonForCreation: String,
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
        },
        // --- Progress ---
        // checkmark/journal: progress is 0 (incomplete) or 1 (done)
        // discrete: progress = number completed of totalCount
        // slider: 0.0 – 100.0
        progress: {
            type: Number,
            default: 0,
        },
        totalCount: Number, // only meaningful for 'discrete' tasks
        completed: {
            type: Boolean,
            default: false,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        // --- Recurrence ---
        // 0 = non-recurring. >0 = resets after this many hours
        recurringHours: {
            type: Number,
            default: 0,
        },
        // Set when a recurring task completes: completedAt + recurringHours
        nextDueAt: {
            type: Date,
            default: null,
        },
        // Who created the task
        createdBy: {
            type: String,
            enum: ["companion", "therapist", "user"],
            default: "companion",
        },
        // Optional semantic embedding (sentence-transformers/all-mpnet-base-v2, 768-dim)
        embedding: {
            type: [Number],
            default: undefined,
        },
    },
    { timestamps: true },
);

const Task = mongoose.model("Task", taskSchema);
module.exports = Task;
