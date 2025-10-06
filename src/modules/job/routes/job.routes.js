// src/modules/job/routes/job.routes.js
const express = require("express");
const router = express.Router();
const jobCtrl = require("../controllers/job.controller");
const auth = require("../../../middlewares/auth.middleware");

// ✅ Doctor-only job creation
router.post("/create", auth, jobCtrl.createJob);

// ✅ Protected routes first (important order)
router.get("/my", auth, jobCtrl.getMyJobs);
router.get("/saved/all", auth, jobCtrl.getSavedJobs);
router.post("/:id/apply", auth, jobCtrl.applyJob);
router.post("/:id/save", auth, jobCtrl.saveJob);

// ✅ Public routes (after all protected ones)
router.get("/", jobCtrl.listJobs);
router.get("/:id", jobCtrl.getJob);

module.exports = router;
