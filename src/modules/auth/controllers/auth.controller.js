const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const User = require("../models/user.model");
const VerificationToken = require("../models/verificationToken.model");
const { autoVerifyID } = require("../../../utils/VerifyAuto"); // optional (Google Vision)

// =============================
// 🔥 FIREBASE SETUP
// =============================
if (!admin.apps.length) {
  const serviceAccount = require("../../../config/firebaseServiceKey.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// =============================
// 🔐 Helper: Generate JWT
// =============================
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });

// =============================
// 📧 EMAIL TRANSPORTER
// =============================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // For STARTTLS (true = SSL)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// =============================
// 🧾 REGISTER USER
// =============================
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, bio, location } = req.body;

    if (!name || !email || !password || !role)
      return res
        .status(400)
        .json({ message: "Name, Email, Password, and Role are required." });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      bio,
      location,
      profilePic: req.files?.profilePic
        ? `/uploads/${req.files.profilePic[0].filename}`
        : "",
      uploadId: req.files?.uploadId
        ? `/uploads/${req.files.uploadId[0].filename}`
        : "",
      isVerified: false,
      verificationStatus: "pending",
    });

    // ✨ Optional: Auto Verification (Google Vision / ML)
    if (req.files?.uploadId?.[0]) {
      try {
        const idPath = path.join(
          __dirname,
          "../../../uploads",
          req.files.uploadId[0].filename
        );
        const result = await autoVerifyID(idPath); // Your Vision API logic
        newUser.verificationStatus = result.isValid ? "verified" : "pending";
        newUser.verificationHistory.push({
          at: new Date(),
          result: result.isValid ? "verified" : "rejected",
          reason: result.reason || "Auto-check result",
        });
        if (result.isValid) newUser.isVerified = true;
        await newUser.save();
      } catch (err) {
        console.warn("⚠️ Auto verification failed:", err.message);
      }
    }

    // 📧 Create email verification token
    const emailToken = crypto.randomBytes(32).toString("hex");
    await VerificationToken.create({
      user: newUser._id,
      token: emailToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // 🔗 Send verification email
    const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${emailToken}`;

    await transporter.sendMail({
      from: process.env.FROM_EMAIL,
      to: email,
      subject: "Verify your MediLink Account",
      html: `
        <div style="font-family: 'Segoe UI', sans-serif; padding: 20px;">
          <h2 style="color:#2563eb;">Welcome to MediLink 👋</h2>
          <p>Hi ${name},</p>
          <p>Click the button below to verify your account:</p>
          <a href="${verifyLink}" 
             style="background:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:10px;">
            Verify My Email
          </a>
          <p style="font-size:12px;color:#6b7280;margin-top:15px;">
            This link will expire in 24 hours.
          </p>
        </div>
      `,
    });

    res.status(201).json({
      success: true,
      message:
        "✅ Registered successfully! Check your email to verify your account.",
    });
  } catch (err) {
    console.error("❌ Register Error:", err.message);
    next(err);
  }
};

// =============================
// 📩 VERIFY EMAIL LINK
// =============================
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token)
      return res.status(400).json({ message: "Verification token missing" });

    const verifyDoc = await VerificationToken.findOne({ token });
    if (!verifyDoc)
      return res.status(400).json({ message: "Invalid or expired token" });

    const user = await User.findById(verifyDoc.user);
    if (!user) return res.status(400).json({ message: "User not found" });

    user.isVerified = true;
    user.verificationStatus = "verified";
    user.verificationHistory.push({
      at: new Date(),
      result: "verified",
      reason: "Email verification completed",
    });

    await user.save();
    await VerificationToken.deleteOne({ _id: verifyDoc._id });

    res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`);
  } catch (err) {
    console.error("❌ Email verification error:", err.message);
    res.status(500).json({ message: "Server error verifying email" });
  }
};

// =============================
// 🔑 LOGIN USER
// =============================
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    if (!user.isVerified)
      return res
        .status(403)
        .json({ message: "Please verify your account before logging in." });

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Login Error:", err.message);
    next(err);
  }
};

// =============================
// ⚡ FIREBASE LOGIN (SSO)
// =============================
exports.firebaseLogin = async (req, res) => {
  try {
    const { firebaseToken } = req.body;
    if (!firebaseToken)
      return res.status(400).json({ message: "Firebase token missing" });

    const decoded = await admin.auth().verifyIdToken(firebaseToken);
    const { uid, name, email, picture } = decoded;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || "New User",
        email,
        password: "firebase-auth",
        role: "user",
        profilePic: picture || "",
        provider: "google",
        providerId: uid,
        isVerified: true,
      });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: "Firebase login successful",
      token,
      user,
    });
  } catch (err) {
    console.error("❌ Firebase Login Error:", err.message);
    res.status(500).json({ message: "Firebase login failed" });
  }
};

// =============================
// 🧠 GET CURRENT USER
// =============================
exports.me = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id)
      return res.status(401).json({ message: "Unauthorized" });

    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error("❌ /me Error:", err.message);
    next(err);
  }
};

// =============================
// 🧾 UPDATE PROFILE
// =============================
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const existingUser = await User.findById(userId);
    if (!existingUser)
      return res.status(404).json({ message: "User not found" });

    const editableFields = [
      "name",
      "bio",
      "location",
      "specialization",
      "experienceYears",
      "university",
      "degree",
      "yearOfStudy",
      "department",
      "position",
    ];

    editableFields.forEach((key) => {
      if (req.body[key] !== undefined) existingUser[key] = req.body[key];
    });

    if (req.files?.profilePic?.[0]) {
      if (existingUser.profilePic) {
        const old = path.join(__dirname, "../../../", existingUser.profilePic);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      existingUser.profilePic = `/uploads/${req.files.profilePic[0].filename}`;
    }

    if (req.files?.uploadId?.[0]) {
      if (existingUser.uploadId) {
        const old = path.join(__dirname, "../../../", existingUser.uploadId);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }
      existingUser.uploadId = `/uploads/${req.files.uploadId[0].filename}`;
    }

    await existingUser.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: existingUser,
    });
  } catch (err) {
    console.error("❌ Profile update error:", err.message);
    res.status(500).json({ message: "Server error updating profile" });
  }
};
