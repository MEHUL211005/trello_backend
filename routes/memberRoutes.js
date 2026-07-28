const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    getBoardMembers,
    toggleMember,
    getCardMembers, 
} = require("../controllers/memberController");

router.get("/boards/:boardId" , authMiddleware , getBoardMembers);
router.post("/cards/:cardId/members/:userId" , authMiddleware , toggleMember); 
router.get("/cards/:cardId" , authMiddleware , getCardMembers);
module.exports = router;
