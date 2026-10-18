const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getProfile,
  updateProfile,
  changePassword,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/refresh" , refreshAccessToken);

router.post("/logout", logoutUser);

router.post("/verify-otp", verifyOtp);

router.post("/resend-otp", resendOtp);

router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);

router.get("/profile", authMiddleware, getProfile);

router.put("/profile", authMiddleware, updateProfile);

router.post("/change-password", authMiddleware, changePassword);

module.exports = router;