const express = require("express");
const router = express.Router();

const checkAuth = require("../middleware/check-auth");

const { sendMessage, getMessagesForUser, getConversation, getChatList } = require("../controllers/message-controller");

router.use(checkAuth);

router.post("/", sendMessage);

router.get("/conversation/:otherUserId", getConversation);

router.get("/chats", getChatList)

router.get("/:userId", getMessagesForUser);


module.exports = router;
