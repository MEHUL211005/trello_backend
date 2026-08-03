const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createCard,
  getCards,
  getSingleCard,
  updateCard,
  deleteCard,
  updateDueDate,
  searchCards,
  reorderCards,
  toggleCardCompleted,
} = require("../controllers/cardController");

router.post("/", authMiddleware, createCard);
router.get("/search", authMiddleware, searchCards);
router.patch("/reorder" , authMiddleware , reorderCards);
router.get("/single/:id" , authMiddleware , getSingleCard);
router.get("/:listId" , authMiddleware , getCards);
router.put("/:id" , authMiddleware , updateCard);
router.delete("/:id" , authMiddleware , deleteCard);
router.patch("/:id/due-date" , authMiddleware , updateDueDate);
router.patch(
  "/:id/toggle-complete",
  authMiddleware,
  toggleCardCompleted
);
module.exports = router;