const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createBoard,
  getBoards,
  updateBoard,
  deleteBoard,
  getBoardById,
  searchBoards,
  toggleStarBoard,
} = require("../controllers/boardController");

router.post("/", authMiddleware, createBoard);
router.get("/search", authMiddleware, searchBoards);
router.get("/single/:id", authMiddleware, getBoardById);
router.get("/:workspaceId", authMiddleware, getBoards);
router.put("/:id", authMiddleware, updateBoard);
router.delete("/:id", authMiddleware, deleteBoard);
router.patch("/:id/star", toggleStarBoard);
module.exports = router;
