const Task = require("../models/Task");

// @desc    Get all tasks for the logged-in user
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
    try {
        const userId = req.user._id;
        // Auto-reset any recurring tasks whose nextDueAt has passed
        const now = new Date();
        await Task.updateMany(
            {
                userId,
                completed: true,
                recurringHours: { $gt: 0 },
                nextDueAt: { $lte: now },
            },
            {
                $set: {
                    completed: false,
                    progress: 0,
                    completedAt: null,
                    nextDueAt: null,
                },
            },
        );
        const tasks = await Task.find({ userId })
            .sort({ createdAt: -1 })
            .lean();
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Create a manual task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            taskName,
            description,
            taskType,
            difficulty,
            totalCount,
            recurringHours,
        } = req.body;
        if (!taskName)
            return res.status(400).json({ message: "taskName is required" });
        if (!taskType)
            return res.status(400).json({ message: "taskType is required" });

        const task = await Task.create({
            userId,
            taskName,
            description: description || "",
            taskType,
            difficulty: difficulty || "easy",
            totalCount: taskType === "discrete" ? totalCount || 1 : undefined,
            recurringHours: recurringHours || 0,
            createdBy: "user",
        });
        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Update task progress (and auto-complete when threshold reached)
// @route   PUT /api/tasks/:id/progress
// @access  Private
const updateProgress = async (req, res) => {
    try {
        const userId = req.user._id;
        const task = await Task.findOne({ _id: req.params.id, userId });
        if (!task) return res.status(404).json({ message: "Task not found" });

        const { progress } = req.body; // number
        if (progress === undefined)
            return res.status(400).json({ message: "progress is required" });

        task.progress = progress;

        // Determine completion based on task type
        let isComplete = false;
        if (task.taskType === "discrete") {
            isComplete = task.totalCount ? progress >= task.totalCount : false;
        } else if (task.taskType === "slider") {
            isComplete = progress >= 100;
        } else if (
            task.taskType === "checkmark" ||
            task.taskType === "journal"
        ) {
            isComplete = progress >= 1;
        }

        if (isComplete && !task.completed) {
            task.completed = true;
            task.completedAt = new Date();
            if (task.recurringHours > 0) {
                task.nextDueAt = new Date(
                    task.completedAt.getTime() +
                        task.recurringHours * 60 * 60 * 1000,
                );
            }
        } else if (!isComplete) {
            task.completed = false;
            task.completedAt = null;
            task.nextDueAt = null;
        }

        await task.save();
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Toggle task completion (quick checkmark/journal toggle)
// @route   PUT /api/tasks/:id
// @access  Private
const toggleTask = async (req, res) => {
    try {
        const userId = req.user._id;
        const task = await Task.findOne({ _id: req.params.id, userId });
        if (!task) return res.status(404).json({ message: "Task not found" });

        task.completed = !task.completed;
        task.progress = task.completed ? 1 : 0;
        task.completedAt = task.completed ? new Date() : null;
        if (task.completed && task.recurringHours > 0) {
            task.nextDueAt = new Date(
                task.completedAt.getTime() +
                    task.recurringHours * 60 * 60 * 1000,
            );
        } else {
            task.nextDueAt = null;
        }
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
    try {
        const userId = req.user._id;
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            userId,
        });
        if (!task) return res.status(404).json({ message: "Task not found" });
        res.json({ message: "Task deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getTasks,
    createTask,
    updateProgress,
    toggleTask,
    deleteTask,
};
