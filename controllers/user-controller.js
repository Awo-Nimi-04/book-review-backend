const { validationResult } = require("express-validator");
const HttpError = require("../models/HttpError");
const User = require("../models/user-model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const getAllUsers = async (req, res, next) => {
  let users;
  try {
    //both ways help filter out password
    users = await User.find(
      {},
      "email firstName lastName username books image"
    );
    // users = User.find({}, "-password");
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Failed to retrieve users.")
    );
  }
  res
    .status(200)
    .json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid credentials. Could not create user.", 422)
    );
  }
  const { firstName, lastName, email, password, profilePic } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    return next(new HttpError("Something went wrong. Try again later."));
  }

  if (existingUser)
    return next(new HttpError("User exists already, login instead"));

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    return next(new HttpError("Could not create user, please try again."));
  }

  const newUser = new User({
    firstName,
    lastName,
    email,
    image: profilePic,
    password: hashedPassword,
    books: [],
  });

  try {
    await newUser.save();
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Could not create this user")
    );
  }

  let token;
  try {
    token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      "supersecret_dont_share",
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(new HttpError("Signing up failed, plase try again."));
  }

  res.status(201).json({
    userId: newUser.id,
    email: newUser.email,
    firstName: firstName,
    lastName: lastName,
    token: token,
    username: `${newUser.firstName} ${newUser.lastName.slice(0, 1)}`,
  });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let user;
  try {
    user = await User.findOne({ email });
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Could not log this user in.")
    );
  }

  if (!user)
    return next(new HttpError("Login failed. Invalid credentials.", 403));

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, user.password);
  } catch (err) {
    return next(new HttpError("Something went wrong. Could not log user in."));
  }

  if (!isValidPassword) {
    return next(new HttpError("Login failed. Invalid credentials.", 403));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: user.id, email: user.email },
      "supersecret_dont_share",
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(new HttpError("Logging in failed, plase try again."));
  }

  res.status(200).json({
    message: "Logged in successfully",
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    token: token,
  });
};

const searchUsers = async (req, res, next) => {
  const q = req.query.q || "";

  try {
    const filter = q.trim()
      ? {
          $or: [
            { firstName: { $regex: q, $options: "i" } },
            { lastName: { $regex: q, $options: "i" } },
            { username: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(filter).select("books username image _id");
    res.status(200).json({ users });
  } catch (error) {
    return next(new HttpError("Search failed. Try again later", 500));
  }
};

const updateProfilePicture = async (req, res, next) => {
  const userId = req.userData.userId;

  if (!req.file || !req.file.path) {
    return next(new HttpError("No image provided.", 422));
  }

  try {
    const user = await User.findById(userId);
    if (!user) return next(new HttpError("No user found.", 404));

    user.image = req.file.path;
    await user.save();

    res.status(200).json({
      message: "Profile picture updated successfully!",
      imageUrl: user.image,
    });
  } catch (err) {
    return next(new HttpError("Could not update profile picture.", 500));
  }
};

const removeProfilePicture = async (req, res, next) => {
  const userId = req.userData.userId;

  try {
    const user = await User.findById(userId);
    if (!user) return next(new HttpError("No user found.", 404));

    user.image = null;
    await user.save();

    res.status(200).json({
      message: "Profile picture removed successfully!",
    });
  } catch (err) {
    return next(new HttpError("Could not remove profile picture.", 500));
  }
};

exports.getAllUsers = getAllUsers;
exports.signup = signup;
exports.login = login;
exports.updateProfilePicture = updateProfilePicture;
exports.removeProfilePicture = removeProfilePicture;
exports.searchUsers = searchUsers;
