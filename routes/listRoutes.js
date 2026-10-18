const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createList,
  getLists,
  updateList,
  deleteList,
  reorderLists,
  setListArchived,
} = require("../controllers/listController");

router.post("/", authMiddleware, createList);
router.patch("/reorder" , authMiddleware , reorderLists);
router.get("/:boardId" , authMiddleware, getLists);
router.put("/:id", authMiddleware, updateList);
router.delete("/:id", authMiddleware, deleteList);
router.patch("/:id/archive", authMiddleware, setListArchived);
module.exports = router;