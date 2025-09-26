const Message = require("../models/message-model");
const mongoose = require("mongoose");

async function createMessage(senderId, receiverId, text) {
    const sender = new mongoose.Types.ObjectId(senderId)
    const receiver = new mongoose.Types.ObjectId(receiverId)
  const message = new Message({
    senderID: sender,
    receiverID: receiver,
    text,
  });
  await message.save();
  return message;
}

module.exports = { createMessage };
