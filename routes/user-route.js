const express = require("express");
const { check } = require("express-validator");

const {
  getAllUsers,
  login,
  signup,
} = require("../controllers/user-controller");

const router = express.Router();

router.get("/", getAllUsers);

router.post(
  "/signup",
  [
    check("firstName").not().isEmpty(),
    check("lastName").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
    check("profilePic").not().isEmpty(),
  ],
  signup
);

router.post("/login", login);


module.exports = router;
