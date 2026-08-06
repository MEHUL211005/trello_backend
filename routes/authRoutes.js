const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getProfile,
  verifyEmail,
} = require("../controllers/authController");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/refresh" , refreshAccessToken);

router.post("/logout", logoutUser);

router.get('/verify-email/:token', verifyEmail);

router.get("/profile", authMiddleware, getProfile);

module.exports = router;