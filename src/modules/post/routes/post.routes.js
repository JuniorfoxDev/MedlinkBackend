const express = require("express");
const router = express.Router();
const { createPost, getAllPosts } = require("../controllers/post.controller");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../../config/multerConfig"); // ✅ your multer setup

router.post("/", authMiddleware, upload.array("media"), createPost);
router.get("/", authMiddleware, getAllPosts);

module.exports = router;
