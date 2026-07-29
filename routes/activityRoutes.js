const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  getCardActivities,
} = require("../controllers/activityController");

router.get(
  "/cards/:cardId",
  authMiddleware,
  getCardActivities
);

module.exports = router;