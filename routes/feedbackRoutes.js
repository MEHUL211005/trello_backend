const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createFeedback,
} = require("../controllers/feedbackController");



router.post(
  "/",
  authMiddleware,
  createFeedback
);



module.exports = router;