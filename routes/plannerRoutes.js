const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  getTasks,
  getAgenda,
  createTask,
  updateTask,
  setTaskDone,
  deleteTask,
} = require("../controllers/plannerController");

router.get("/", authMiddleware, getTasks);
router.get("/agenda", authMiddleware, getAgenda);
router.post("/", authMiddleware, createTask);
router.put("/:id", authMiddleware, updateTask);
router.patch("/:id/done", authMiddleware, setTaskDone);
router.delete("/:id", authMiddleware, deleteTask);

module.exports = router;
