const express = require("express");
const {
    createConversation,
    getConversations,
    getMessages,
    deleteConversation,
} = require("../controllers/conversationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router
    .route("/")
    .get(protect, getConversations)
    .post(protect, createConversation);
router.route("/:id/messages").get(protect, getMessages);
router.route("/:id").delete(protect, deleteConversation);

module.exports = router;
