const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const {
  createWorkspace,
  getWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceById,
  searchWorkspaces,
} = require("../controllers/workspaceController");

router.post("/", authMiddleware, createWorkspace);

router.get("/", authMiddleware, getWorkspaces);
router.get("/search", authMiddleware, searchWorkspaces);

router.get("/:id", authMiddleware, getWorkspaceById);

router.put("/:id", authMiddleware, updateWorkspace);

router.delete("/:id", authMiddleware, deleteWorkspace);

module.exports = router;
