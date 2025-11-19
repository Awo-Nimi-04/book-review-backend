const express = require("express");
const { check } = require("express-validator");

const {
  getAllUsers,
  login,
  signup,
  updateProfilePicture,
  removeProfilePicture,
  searchUsers,
  updateUsername,
} = require("../controllers/user-controller");
const checkAuth = require("../middleware/check-auth");
const upload = require("../middleware/file-upload");

const router = express.Router();

router.get("/", getAllUsers);

router.post(
  "/signup",
  [
    check("firstName").not().isEmpty(),
    check("lastName").not().isEmpty(),
    check("username").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  signup
);

router.post("/login", login);
router.get("/search", searchUsers);
router.use(checkAuth);

router.patch("/profile-picture", upload.single("image"), updateProfilePicture);

router.patch("/remove-picture", removeProfilePicture);

router.patch("/update-username", updateUsername);

module.exports = router;
