const multer = require("multer");
const { storage } = require("../services/cloudinary");

const upload = multer({ storage: storage });

module.exports = upload;
