const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minLength: 6 },
  image: { type: String, default: null },
  books: [{ type: mongoose.Types.ObjectId, required: true, ref: "Book" }],
});

module.exports = mongoose.model("User", userSchema);
