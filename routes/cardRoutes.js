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
  searchCards
} = require("../controllers/cardController");

router.post("/", authMiddleware, createCard);
router.get("/search", authMiddleware, searchCards);
router.get("/single/:id" , authMiddleware , getSingleCard);
router.get("/:listId" , authMiddleware , getCards);
router.put("/:id" , authMiddleware , updateCard);
router.delete("/:id" , authMiddleware , deleteCard);
router.patch("/:id/due-date" , authMiddleware , updateDueDate);
module.exports = router;