const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createLabel,
  toggleLabel,
  getBoardLabels,
  getCardLabels,
} = require("../controllers/labelController");

router.post("/", authMiddleware, createLabel);
router.post("/cards/:cardId/labels/:labelId" , authMiddleware , toggleLabel);
router.get("/boards/:boardId" , authMiddleware , getBoardLabels);
router.get("/cards/:cardId", authMiddleware , getCardLabels);
module.exports = router;