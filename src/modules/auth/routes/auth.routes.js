const express = require("express");
const router = express.Router();
const upload = require("../../../middlewares/upload.middleware");
const authController = require("../controllers/auth.controller");
const authMW = require("../../../middlewares/auth.middleware");
const {updateProfile }= require("../controllers/auth.controller")
// Register
router.post(
  "/register",
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "uploadId", maxCount: 1 },
  ]),
  authController.register
);

router.get("/verify-email", authController.verifyEmail);
router.post("/login", authController.login);
router.post("/firebase-login", authController.firebaseLogin);
router.get("/me", authMW, authController.me);
router.post(
  "/update-profile",
  authMW,
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "uploadId", maxCount: 1 },
  ]),
  authController.updateProfile
);


module.exports = router;
