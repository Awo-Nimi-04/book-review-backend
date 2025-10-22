const express = require("express");
const { check } = require("express-validator");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

const {
  getAllBooks,
  getBookByID,
  getBookByUserID,
  createBook,
  updateBook,
  deleteBook,
  likeBook,
  searchBooks,
} = require("../controllers/book-controller");

//getAllBooks
router.get("/", getAllBooks);

router.get("/search", searchBooks);

router.use(checkAuth);

//getBookByUserID
router.get("/user/:userID", getBookByUserID);

//getBookByID
router.get("/:bookId", getBookByID);

//createBook
router.post(
  "/",
  [
    check("ISBN").isLength({ min: 13, max: 13 }),
    check("title").not().isEmpty(),
    check("author").not().isEmpty(),
    check("genre").not().isEmpty(),
    check("review").isLength({ min: 6 }),
  ],
  createBook
);

router.patch("/like/:bookId", likeBook);

router.patch(
  "/:bookId",
  [check("review").isLength({ min: 6 }), check("genre").not().isEmpty()],
  updateBook
);

router.delete("/:bookId", deleteBook);

module.exports = router;
