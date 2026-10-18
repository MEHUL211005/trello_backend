const Board = require("../models/Board");
const List = require("../models/List");
const Card = require("../models/Card");
const Workspace = require("../models/Workspace");
const BoardMember = require("../models/BoardMember");

// Roles that may change board content (lists, cards, labels, ...)
const WRITE_ROLES = ["OWNER", "MEMBER"];
// Roles that may manage the board itself (rename, delete, invite)
const ADMIN_ROLES = ["OWNER"];

/**
 * Role of a user on a board:
 *  - "OWNER" if they own the workspace or are the board's OWNER member
 *  - the BoardMember role otherwise
 *  - null when they have no access
 */
const getBoardRole = async (userId, board) => {
  if (!board) return null;

  const workspace = await Workspace.findOne({
    where: { id: board.workspaceId, userId },
    attributes: ["id"],
  });

  if (workspace) return "OWNER";

  const member = await BoardMember.findOne({
    where: { boardId: board.id, userId },
    attributes: ["role"],
  });

  return member ? member.role : null;
};

const getBoardRoleById = async (userId, boardId) => {
  const board = await Board.findByPk(boardId);
  return { board, role: await getBoardRole(userId, board) };
};

const getListAccess = async (userId, listId) => {
  const list = await List.findByPk(listId);
  if (!list) return { list: null, board: null, role: null };

  const { board, role } = await getBoardRoleById(userId, list.boardId);
  return { list, board, role };
};

const getCardAccess = async (userId, cardId) => {
  const card = await Card.findByPk(cardId);
  if (!card) return { card: null, list: null, board: null, role: null };

  const { list, board, role } = await getListAccess(userId, card.listId);
  return { card, list, board, role };
};

// Ids of every board the user owns (via workspace) or is a member of
const getAccessibleBoardIds = async (userId) => {
  const [ownedBoards, memberships] = await Promise.all([
    Board.findAll({
      attributes: ["id"],
      include: [
        {
          model: Workspace,
          as: "workspace",
          where: { userId },
          attributes: [],
          required: true,
        },
      ],
    }),
    BoardMember.findAll({ where: { userId }, attributes: ["boardId"] }),
  ]);

  return [
    ...new Set([
      ...ownedBoards.map((b) => b.id),
      ...memberships.map((m) => m.boardId),
    ]),
  ];
};

// The names users see: the stored MEMBER role is shown as "Editor"
const ROLE_LABELS = { OWNER: "OWNER", MEMBER: "EDITOR", VIEWER: "VIEWER" };
const roleLabel = (role) => ROLE_LABELS[role] || null;

// Accepts what the API clients send (EDITOR / VIEWER, or the stored MEMBER)
// and returns the stored role, or null when it is not a shareable role
const parseShareRole = (input) => {
  const value = String(input || "").trim().toUpperCase();
  if (value === "EDITOR" || value === "MEMBER") return "MEMBER";
  if (value === "VIEWER") return "VIEWER";
  return null;
};

const canRead = (role) => !!role;
const canWrite = (role) => WRITE_ROLES.includes(role);
const canAdmin = (role) => ADMIN_ROLES.includes(role);

const denied = (res) =>
  res.status(403).json({
    success: false,
    message: "Access denied",
  });

module.exports = {
  getBoardRole,
  getBoardRoleById,
  getListAccess,
  getCardAccess,
  getAccessibleBoardIds,
  roleLabel,
  parseShareRole,
  canRead,
  canWrite,
  canAdmin,
  denied,
};
