const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path"); // ✅ add this line

// Create app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Import Routes
const authRoutes = require("./modules/auth/routes/auth.routes");
const userRoutes = require("./modules/userProfile/userProfile.routes");
const jobsRoutes = require("./modules/job/routes/job.routes");
const postRoutes = require("./modules/posts/post.routes");
app.use("/api/posts", postRoutes);

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobsRoutes);

// ✅ Serve uploaded files properly
// app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({ message: "MediLink API is running 🚀" });
});

module.exports = app;
