const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  createBoard,
  getBoards,
  updateBoard,
  deleteBoard,
  getBoardById,
  searchBoards,
  toggleStarBoard,
  filterBoardCards,
  getStarredBoards,
  getAllBoards,
  getArchivedItems,
} = require("../controllers/boardController");

const {
  inviteToBoard,
  getBoardMembers,
  updateMemberRole,
  removeMember,
  revokeInvitation,
  getSharedBoards,
  getPeople,
} = require("../controllers/boardSharingController");

router.post("/", authMiddleware, createBoard);
router.get("/search", authMiddleware, searchBoards);
router.get("/shared", authMiddleware, getSharedBoards);
router.get("/starred", authMiddleware, getStarredBoards);
router.get("/all", authMiddleware, getAllBoards);
router.get("/people", authMiddleware, getPeople);
router.get("/single/:id", authMiddleware, getBoardById);
router.get("/:workspaceId", authMiddleware, getBoards);
router.put("/:id", authMiddleware, updateBoard);
router.delete("/:id", authMiddleware, deleteBoard);
router.patch("/:id/star", authMiddleware, toggleStarBoard);
router.get("/:id/filter", authMiddleware, filterBoardCards);
router.get("/:id/archived", authMiddleware, getArchivedItems);
router.post("/:id/invite", authMiddleware, inviteToBoard);
router.get("/:id/members", authMiddleware, getBoardMembers);
router.patch("/:id/members/:userId", authMiddleware, updateMemberRole);
router.delete("/:id/members/:userId", authMiddleware, removeMember);
router.delete("/:id/invitations/:invitationId", authMiddleware, revokeInvitation);
module.exports = router;

