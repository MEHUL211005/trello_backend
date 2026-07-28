const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  addComment,
  getComments,
  deleteComment,
  updateComment
} = require("../controllers/commentController");

router.post(
  "/cards/:cardId",
  authMiddleware,
  addComment
);
router.delete("/:id" , authMiddleware , deleteComment);
router.get("/cards/:cardId" , authMiddleware , getComments);
router.patch("/:id", authMiddleware, updateComment);

module.exports = router;