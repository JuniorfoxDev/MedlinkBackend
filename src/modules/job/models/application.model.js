const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverLetter: { type: String },
    status: { type: String, default: "applied" }, // applied / shortlisted / rejected
    // optional: resume path, attachments etc
  },
  { timestamps: true }
);

module.exports = mongoose.model("Application", ApplicationSchema);
