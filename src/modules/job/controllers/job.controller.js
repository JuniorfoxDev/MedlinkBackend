// src/modules/job/controllers/jobs.controller.js

const Job = require("../models/job.model");
const Application = require("../models/application.model");
const User = require("../../../modules/auth/models/user.model");
const nodemailer = require("nodemailer");
const path = require("path");

// =========================
// ✉️ Setup Nodemailer
// =========================
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 🧩 Helper: Send email notification to doctor
const sendApplicationEmail = async ({ to, job, applicant, resumePath }) => {
  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#333">
      <h3>Hello Dr. ${to.name || "Doctor"},</h3>
      <p><b>${applicant.name}</b> (${
    applicant.email
  }) has applied for your job post: <b>${job.title}</b></p>
      <p>Applicant role: ${applicant.role || "N/A"}</p>
      ${
        resumePath
          ? `<p>📎 Resume: <a href="${resumePath}" target="_blank">View Resume</a></p>`
          : ""
      }
      <p>Login to your MediLink Dashboard to review applicants.</p>
      <hr/>
      <p>Regards,<br/>The MediLink Team</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: to.email,
    subject: `New Application for: ${job.title}`,
    html,
  });
};

// =========================
// 🩺 Create Job (Doctor only)
// =========================
exports.createJob = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can post jobs" });
    }

    const { title, hospital, location, type, description, tags } = req.body;
    if (!title || !hospital) {
      return res
        .status(400)
        .json({ message: "Title and hospital are required" });
    }

    const job = await Job.create({
      title,
      hospital,
      location,
      type,
      description,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      postedBy: req.user.id,
    });

    res.status(201).json({ success: true, job });
  } catch (err) {
    console.error("❌ Job creation failed:", err);
    next(err);
  }
};

// =========================
// 🌍 Get all jobs
// =========================
exports.listJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find()
      .populate("postedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, jobs });
  } catch (err) {
    next(err);
  }
};

// =========================
// 📄 Get single job
// =========================
exports.getJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      "postedBy",
      "name email role"
    );
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ success: true, job });
  } catch (err) {
    next(err);
  }
};

// =========================
// 🧾 Apply for a job (with resume upload)
// =========================
exports.applyJob = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Login required" });

    const job = await Job.findById(req.params.id).populate("postedBy");
    if (!job) return res.status(404).json({ message: "Job not found" });

    // Prevent duplicate apply
    const already = await Application.findOne({
      job: job._id,
      applicant: req.user.id,
    });
    if (already)
      return res.status(400).json({ message: "Already applied to this job" });

    // File upload path
    const resumePath = req.file
      ? `/uploads/resumes/${req.file.filename}`
      : null;

    // Create application
    const { coverLetter } = req.body;
    const application = await Application.create({
      job: job._id,
      applicant: req.user.id,
      resume: resumePath,
      coverLetter,
    });

    // Fetch applicant & poster info
    const applicant = await User.findById(req.user.id).select(
      "name email role"
    );
    const poster = await User.findById(job.postedBy._id).select("name email");

    // Send email (async)
    sendApplicationEmail({ to: poster, job, applicant, resumePath }).catch(
      (err) => console.error("📧 Email failed:", err.message)
    );

    res
      .status(201)
      .json({ success: true, message: "Applied successfully!", application });
  } catch (err) {
    next(err);
  }
};

// =========================
// ⭐ Save/Unsave job
// =========================
exports.saveJob = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const jobId = req.params.id;
    const index = user.savedJobs.findIndex((id) => id.toString() === jobId);

    if (index > -1) {
      user.savedJobs.splice(index, 1);
      await user.save();
      return res.json({ success: true, saved: false });
    } else {
      user.savedJobs.push(jobId);
      await user.save();
      return res.json({ success: true, saved: true });
    }
  } catch (err) {
    next(err);
  }
};

// =========================
// 💼 Get Saved Jobs
// =========================
exports.getSavedJobs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("savedJobs");
    res.json({ success: true, savedJobs: user.savedJobs || [] });
  } catch (err) {
    next(err);
  }
};

// =========================
// 🧠 Doctor’s Job Dashboard
// =========================
exports.getMyJobs = async (req, res, next) => {
  try {
    if (req.user.role !== "doctor") {
      return res
        .status(403)
        .json({ message: "Access restricted to doctors only" });
    }

    const jobs = await Job.find({ postedBy: req.user.id })
      .populate("applicants.user", "name email role")
      .sort({ createdAt: -1 });

    res.json({ success: true, jobs });
  } catch (err) {
    next(err);
  }
};
