const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const HttpError = require("../models/HttpError");
const Book = require("../models/book-model");
const User = require("../models/user-model");

const getAllBooks = async (req, res, next) => {
  let result;
  try {
    result = await Book.find().populate("creatorID", "firstName lastName");
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Could not retrieve books.")
    );
  }

  res.json({ 
    posts: result.map((book) => book.toObject({ getters: true })) 
  });
};


const getBookByID = async (req, res, next) => {
  const { bookId } = req.params;
  let book;
  try {
    book = await Book.findById(bookId);
  } catch (err) {
    return next(new HttpError("Something went wrong. Could not find book."));
  }
  res.json({ book: book.toObject({ getters: true }) });
};

const getBookByUserID = async (req, res, next) => {
  const { userID } = req.params;
  const currentUserId = req.userData.userId;

  let userBooks;
  try {
    userBooks = await Book.find({ creatorID: userID });
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Could not find books.", 500)
    );
  }

  const booksWithLikeStatus = userBooks.map((book) => {
    const bookObj = book.toObject({ getters: true });
    bookObj.likedByUser = book.likes.some(
      (id) => id.toString() === currentUserId.toString()
    );
    bookObj.totalLikes = book.likes.length;
    return bookObj;
  });

  res.json({ books: booksWithLikeStatus });
};

const createBook = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Could not create book post. Check your data.", 422)
    );
  }

  const { ISBN, title, author, genre, review } = req.body;

  const newBook = new Book({
    ISBN,
    title,
    author,
    genre,
    review,
    creatorID: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch {
    return next(new HttpError("Something went wrong. Please try again"));
  }

  if (!user)
    return next(
      new HttpError("Could not find this user. Please try again", 404)
    );

  try {
    // await newBook.save();
    //want to make sure both changes are saved only if both succeed. If anyone fails, the changes should be reverted
    const session = await mongoose.startSession();
    session.startTransaction();
    await newBook.save({ session: session });
    user.books.push(newBook);
    await user.save({ session: session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError("Creating book failed, please try again.");
    return next(error);
  }
  res.status(201).json({ book: newBook });
};

const updateBook = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Could not update book post. Check your data.", 422)
    );
  }

  const { bookId } = req.params;
  const { title, author, genre, review } = req.body;
  let book;
  try {
    book = await Book.findById(bookId);
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Could not update place.", 500)
    );
  }

  if (!book)
    return next(new HttpError("Could not find a place with this ID", 500));

  if (book.creatorID.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to edit this.", 401));
  }

  try {
    book = await Book.findByIdAndUpdate(
      bookId,
      { title, author, genre, review },
      { new: true }
    );
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Could not update this book post.")
    );
  }
  res.json({ book: book.toObject({ getters: true }) });
};

const deleteBook = async (req, res, next) => {
  const { bookId } = req.params;

  let book;
  try {
    book = await Book.findById(bookId).populate("creatorID");
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Could not delete this book.")
    );
  }

  if (!book) return next(new HttpError("Could not find this book.", 404));

  if (book.creatorID.id !== req.userData.userId) {
    return next(new HttpError("You are not allowed to delete this!", 401));
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await book.deleteOne({ session: sess });
    book.creatorID.books.pull(book);
    await book.creatorID.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(
      new HttpError("Something went wrong. Could not delete this book.")
    );
  }

  res.json({ message: "Deleted successfully" });
};

const likeBook = async (req, res, next) => {
  const bookId = req.params.bookId;
  const userId = req.userData.userId;

  try {
    const book = await Book.findById(bookId);
    if (!book) {
      return next(new HttpError("Book not found", 404));
    }

    const hasLiked = book.likes.includes(userId);

    if (hasLiked) {
      // Unlike it
      book.likes = book.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Like it
      book.likes.push(userId);
    }

    await book.save();

    res.status(200).json({
      message: hasLiked ? "Book unliked" : "Book liked",
      totalLikes: book.likes.length,
      likedByUser: !hasLiked,
    });
  } catch (err) {
    return next(new HttpError("Failed to like/unlike book", 500));
  }
};

exports.createBook = createBook;
exports.getAllBooks = getAllBooks;
exports.getBookByID = getBookByID;
exports.getBookByUserID = getBookByUserID;
exports.updateBook = updateBook;
exports.deleteBook = deleteBook;
exports.likeBook = likeBook;
