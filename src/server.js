const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");
const errorHandler = require("./middlewares/error.middleware");

// ✅ Load .env file properly
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// ✅ Log environment values to verify
console.log(
  "JWT_SECRET from env:",
  process.env.JWT_SECRET ? "✅ Loaded" : "❌ Missing"
);
console.log("MONGO_URI:", process.env.MONGO_URI ? "✅ Found" : "❌ Missing");

// ✅ Connect to MongoDB
connectDB();

// ✅ Import app.js
const app = require("./app");

// ✅ Serve uploads folder (if needed)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Error handling middleware
app.use(errorHandler);

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("====================================");
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log("====================================");
});
