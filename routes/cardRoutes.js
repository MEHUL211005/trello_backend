const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createCard,
  getCards,
  getSingleCard,
  updateCard,
  deleteCard
} = require("../controllers/cardController");

router.post("/", authMiddleware, createCard);
router.get("/single/:id" , authMiddleware , getSingleCard);
router.get("/:listId" , authMiddleware , getCards);
router.put("/:id" , authMiddleware , updateCard);
router.delete("/:id" , authMiddleware , deleteCard);
module.exports = router;