const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createChecklist,
  getChecklists,
  addChecklistItem,
  toggleChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  updateChecklist,
  deleteChecklist,
  getChecklistProgress
} = require("../controllers/checklistController");

router.post(
  "/cards/:cardId",
  authMiddleware,
  createChecklist
);
router.get("/cards/:cardId" , authMiddleware , getChecklists); 
router.post("/:checklistId/items" , authMiddleware , addChecklistItem);
router.patch("/items/:itemId/toggle" , authMiddleware , toggleChecklistItem);
router.patch("/items/:itemId" , authMiddleware , updateChecklistItem);
router.delete("/items/:itemId" , authMiddleware , deleteChecklistItem);
router.patch("/:checklistId" , authMiddleware , updateChecklist);
router.delete("/:checklistId" , authMiddleware , deleteChecklist);
router.get("/:checklistId/progress" , authMiddleware , getChecklistProgress);
module.exports = router;