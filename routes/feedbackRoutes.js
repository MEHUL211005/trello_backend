const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const rateLimit = require("../middlewares/rateLimit");

const { createFeedback } = require("../controllers/feedbackController");

// A handful per hour per person is plenty, and keeps the inbox safe from spam
const feedbackLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  onlySuccessful: true,
  keyFn: (req) => `user:${req.user.id}`,
  message: "You've sent a lot of feedback recently. Please try again later.",
});

router.post("/", authMiddleware, feedbackLimiter, createFeedback);

module.exports = router;
