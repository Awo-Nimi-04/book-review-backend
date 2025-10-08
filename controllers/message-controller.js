const Message = require("../models/message-model");
const HttpError = require("../models/HttpError");
const { createMessage } = require("../services/message-service");
const { default: mongoose } = require("mongoose");

const sendMessage = async (req, res, next) => {
  const { receiverID, text } = req.body;

  if (!receiverID || !text) {
    return next(new HttpError("Missing fields", 400));
  }

  try {
    const message = await createMessage(req.userData.userId, receiverID, text);
    res.status(201).json({ message });
  } catch (err) {
    return next(new HttpError("Sending message failed", 500));
  }
};

const getMessagesForUser = async (req, res, next) => {
  const userId = req.params.userId;

  // ensure authorized user is only able to view thier own message
  if (req.userData.userId !== userId) {
    return next(new HttpError("Not authorized to view these messages.", 403));
  }

  const user = new mongoose.Types.ObjectId(userId);
  try {
    // TODO: Need to understand query
    const messages = await Message.find({
      $or: [{ senderID: user }, { receiverID: user }],
    }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (err) {
    return next(new HttpError("Fetching messages failed", 500));
  }
};

const getConversation = async (req, res, next) => {
  const otherUserId = req.params.otherUserId;
  const authUserId = req.userData.userId;

  try {
    const authUser = new mongoose.Types.ObjectId(authUserId);
    const otherUser = new mongoose.Types.ObjectId(otherUserId);
    // const loggedInUser = mongoose.Types.ObjectId(req.)

    // Mark unread messages sent to loggedInUser by otherUser as read
    await Message.updateMany(
      {
        senderID: otherUser,
        receiverID: authUser,
        read: false,
      },
      { $set: { read: true } }
    );

    const messages = await Message.find({
      $or: [
        { senderID: authUser, receiverID: otherUser },
        { senderID: otherUser, receiverID: authUser },
      ],
    }).sort({ createdAt: 1 });

    res.json({ messages });
  } catch (err) {
    return next(new HttpError("Fetching conversations failed", 500));
  }
};

const getChatList = async (req, res, next) => {
  const userId = req.userData.userId;
  try {
    const user = new mongoose.Types.ObjectId(userId);

    const chats = await Message.aggregate([
      // find messages involving logged-in user
      { $match: { $or: [{ senderID: user }, { receiverID: user }] } },

      // Keep only text, read, and createdAt fields.
      // Add a computed field otherUser
      // If the logged-in user is the sender, otherUser is the receiver; otherwise, it’s the sender
      {
        $project: {
          text: 1,
          read: 1,
          createdAt: 1,
          senderID: 1,
          receiverID: 1,
          otherUser: {
            $cond: [{ $eq: ["$senderID", user] }, "$receiverID", "$senderID"],
          },
        },
      },

      // Sort messages by createdAt descending so the newest messages come first.
      { $sort: { createdAt: -1 } },

      // Group messages by otherUser so each conversation appears once.
      // "$first" takes the newest message in that conversation because of the previous sort.
      {
        $group: {
          _id: "$otherUser",
          lastMessage: { $first: "$text" },
          lastMessageTime: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$read", false] },
                    { $eq: ["$receiverID", user] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      // Lookup user info for the otherUser
      {
        $lookup: {
          from: "users", // collection name in MongoDB
          localField: "_id", // _id from the group = otherUserId
          foreignField: "_id", // match against user's _id
          as: "otherUserInfo",
        },
      },

      // Unwind since lookup returns an array
      { $unwind: "$otherUserInfo" },

      // Project only the fields we want from user
      {
        $project: {
          lastMessage: 1,
          lastMessageTime: 1,
          unreadCount: 1,
          otherUserId: "$_id",
          firstName: "$otherUserInfo.firstName",
          lastName: "$otherUserInfo.lastName",
        },
      },

      // Sort the conversations by lastMessageTime descending
      // so the most recently active conversations appear first, like WhatsApp.
      { $sort: { lastMessageTime: -1 } },
    ]);
    res.json({ chats });
  } catch (err) {
    return next(new HttpError("Fetching chat list failed", 500));
  }
};

module.exports = {
  sendMessage,
  getMessagesForUser,
  getConversation,
  getChatList,
};
