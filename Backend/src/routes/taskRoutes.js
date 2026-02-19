const express = require("express");
const {
    getTasks,
    createTask,
    updateProgress,
    toggleTask,
    deleteTask,
} = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getTasks).post(protect, createTask);
router.route("/:id").put(protect, toggleTask).delete(protect, deleteTask);
router.route("/:id/progress").put(protect, updateProgress);

module.exports = router;
