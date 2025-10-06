const express = require("express");
const router = express.Router();
const { createPost } = require("./post.controller");
const authMiddleware = require("../../middlewares/authMiddleware");
const upload = require("../../middlewares/upload");

router.post(
  "/",
  authMiddleware,
  upload.array("media", 5), // up to 5 files
  createPost
);

module.exports = router;
