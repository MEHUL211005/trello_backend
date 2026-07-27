const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { createWorkspace , getWorkspaces , updateWorkspace , deleteWorkspace } = require("../controllers/workspaceController");


router.post("/", authMiddleware, createWorkspace);

router.get("/", authMiddleware, getWorkspaces);

router.put("/:id" , authMiddleware , updateWorkspace);

router.delete("/:id" , authMiddleware , deleteWorkspace);

module.exports = router;