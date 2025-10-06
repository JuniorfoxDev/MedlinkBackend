const express = require("express");
const router = express.Router();
const User = require("../../modules/auth/models/user.model");
const auth = require("../../middlewares/auth.middleware");

// ✅ Get all users except the logged-in one
router.get("/", auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select(
      "name email role bio profilePic location specialization connections"
    );
    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Get my connections
router.get("/connections", auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate(
      "connections",
      "name email role bio profilePic location"
    );
    res.status(200).json({
      success: true,
      connections: me.connections || [],
    });
  } catch (err) {
    console.error("❌ Fetch connections failed:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Connect with another user
router.post("/:id/connect", auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const other = await User.findById(req.params.id);

    if (!other) return res.status(404).json({ message: "User not found" });

    if (me.connections.includes(other._id))
      return res.status(400).json({ message: "Already connected" });

    me.connections.push(other._id);
    other.connections.push(me._id);
    await me.save();
    await other.save();

    res.json({ success: true, message: `Connected with ${other.name}` });
  } catch (err) {
    console.error("❌ Connect failed:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Remove a connection
router.post("/:id/unconnect", auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const other = await User.findById(req.params.id);

    if (!other) return res.status(404).json({ message: "User not found" });

    me.connections = me.connections.filter(
      (id) => id.toString() !== other._id.toString()
    );
    other.connections = other.connections.filter(
      (id) => id.toString() !== me._id.toString()
    );

    await me.save();
    await other.save();

    res.json({
      success: true,
      message: `Removed connection with ${other.name}`,
    });
  } catch (err) {
    console.error("❌ Unconnect failed:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
