const express = require("express");
const {
    getMemories,
    createMemory,
    updateMemory,
    deleteMemory,
} = require("../controllers/memoryController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.route("/").get(protect, getMemories).post(protect, createMemory);
router.route("/:id").put(protect, updateMemory).delete(protect, deleteMemory);

module.exports = router;
