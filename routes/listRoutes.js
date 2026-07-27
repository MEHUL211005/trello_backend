const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createList,
  getLists,
  updateList,
  deleteList
} = require("../controllers/listController");

router.post("/", authMiddleware, createList);
router.get("/:boardId" , authMiddleware, getLists);
router.put("/:id", authMiddleware, updateList);
router.delete("/:id", authMiddleware, deleteList);

module.exports = router;