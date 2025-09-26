const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const bookSchema = new Schema({
  ISBN: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  review: { type: String, required: true },
  genre: { type: String, required: true },
  creatorID: { type: mongoose.Types.ObjectId, required: true, ref: "User" },
});

module.exports = mongoose.model("Book", bookSchema);
