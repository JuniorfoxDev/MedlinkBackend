const Post = require("./post.model");
const path = require("path");

exports.createPost = async (req, res) => {
  try {
    const { text } = req.body;
    const userId = req.user.id;

    // validate
    if (!text && !req.files?.length)
      return res.status(400).json({ message: "Post cannot be empty" });

    // prepare media array
    const media = (req.files || []).map((file) => ({
      url: `/uploads/${file.filename}`,
      type: file.mimetype.startsWith("video") ? "video" : "image",
    }));

    const newPost = await Post.create({
      user: userId,
      text,
      media,
    });

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: newPost,
    });
  } catch (err) {
    console.error("❌ Create post error:", err);
    res.status(500).json({ message: "Server error creating post" });
  }
};
