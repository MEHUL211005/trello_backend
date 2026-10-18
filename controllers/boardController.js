const { Op } = require("sequelize");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");
const List = require("../models/List");
const Card = require("../models/Card");
const Checklist = require("../models/Checklist");
const ChecklistItem = require("../models/ChecklistItem");
const User = require("../models/User");
const Attachment = require("../models/Attachment");
const Comment = require("../models/Comment");
const Label = require("../models/Label");
const BoardMember = require ("../models/BoardMember");
const BoardStar = require("../models/BoardStar");
const { normalizeBackground } = require("../utils/boardBackgrounds");
const { withStars, starredSet } = require("../utils/stars");
const {
  getBoardRole,
  getAccessibleBoardIds,
  roleLabel,
  canRead,
  canWrite,
  canAdmin,
  denied,
} = require("../utils/boardAccess");
const createBoard = async (req, res) => {
  try {
    let { name, background, workspaceId } = req.body;

    // Required Fields
    if (!name || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: "Name and Workspace ID are required",
      });
    }

    // Remove extra spaces
    name = name.trim();

    const chosen = normalizeBackground(background);
    if (!chosen.ok) {
      return res.status(400).json({
        success: false,
        message: "That background is not available",
      });
    }
    background = chosen.value;

    // Find Workspace
    const workspace = await Workspace.findOne({
      where: {
        id: workspaceId,
        userId: req.user.id,
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

// Create Board
const board = await Board.create({
  name,
  background,
  workspaceId,
});

// Add creator as OWNER
await BoardMember.create({
  boardId: board.id,
  userId: req.user.id,
  role: "OWNER",
});

return res.status(201).json({
  success: true,
  message: "Board created successfully",
  board: { ...board.toJSON(), isStarred: false },
});
  } catch (error) {
    console.log("Create Board Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getBoards = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Check if workspace exists
    const workspace = await Workspace.findByPk(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // If user owns the workspace → return all boards
    if (workspace.userId === req.user.id) {
      const boards = await Board.findAll({
        where: {
          workspaceId,
        },
        order: [["createdAt", "DESC"]],
      });

      return res.status(200).json({
        success: true,
        boards: await withStars(req.user.id, boards),
      });
    }

    // If user doesn't own workspace,
    // return only boards where user is a member
    const boards = await Board.findAll({
      where: {
        workspaceId,
      },
      include: [
        {
          model: BoardMember,
          as: "boardMembers",
          where: {
            userId: req.user.id,
          },
          attributes: [],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      boards: await withStars(req.user.id, boards),
    });
  } catch (error) {
    console.log("Get Boards Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const updateBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const chosen = normalizeBackground(req.body.background);

    if (!chosen.ok) {
      return res.status(400).json({
        success: false,
        message: "That background is not available",
      });
    }

    const background = chosen.value;

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Board name is required",
      });
    }

    // Find Board
    const board = await Board.findByPk(id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // Verify ownership
    const role = await getBoardRole(req.user.id, board);
    if (!canAdmin(role)) {
      return denied(res);
    }

    // Only change the fields that were sent
    if (name !== undefined) {
      board.name = name.trim();
    }

    if (background !== undefined) {
      board.background = background;
    }

    await board.save();

    const [withStar] = await withStars(req.user.id, [board]);

    return res.status(200).json({
      success: true,
      message: "Board updated successfully",
      board: withStar,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const deleteBoard = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await Board.findByPk(id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const role = await getBoardRole(req.user.id, board);
    if (!canAdmin(role)) {
      return denied(res);
    }

    await board.destroy();

    return res.status(200).json({
      success: true,
      message: "Board deleted successfully",
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const searchBoards = async (req, res) => {
  try {
    const { query } = req.query;
    const trimmedQuery = query?.trim();

    if (!trimmedQuery) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Boards the user owns or has been invited to
    const boardIds = await getAccessibleBoardIds(req.user.id);

    const boards = await Board.findAll({
      where: {
        id: {
          [Op.in]: boardIds,
        },
        name: {
          [Op.like]: `%${trimmedQuery}%`,
        },
      },
      include: [
        {
          model: Workspace,
          as: "workspace",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: boards.length,
      boards: await withStars(req.user.id, boards),
    });
  } catch (error) {
    console.log("Search Boards Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const getBoardById = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await Board.findByPk(id, {
      include: [
        {
          model: List,
          as: "lists",
          where: { isArchived: false },
          required: false,
          include: [
            {
              model: Card,
              as: "cards",
              where: { isArchived: false },
              required: false,
              include: [
                {
                  model: User,
                  as: "members",
                  attributes: ["id", "name", "email"],
                  through: { attributes: [] },
                },

                {
                  model: Checklist,
                  include: [
                    {
                      model: ChecklistItem,
                    },
                  ],
                },

                {
                  model: Attachment,
                },
                {
                  // Only the ids: the card shows how many comments it has
                  model: Comment,
                  attributes: ["id"],
                },
                {
                  model: Label,
                  attributes: ["id", "name", "color"],
                  through: { attributes: [] },
                },
              ],
            },
          ],
        },
      ],
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // Owners and invited members can view the board
    const role = await getBoardRole(req.user.id, board);

    if (!canRead(role)) {
      return denied(res);
    }

    // Who owns the board (shown to people it is shared with)
    const ownerWorkspace = await Workspace.findByPk(board.workspaceId, {
      attributes: ["userId"],
    });
    const owner = ownerWorkspace
      ? await User.findByPk(ownerWorkspace.userId, {
          attributes: ["id", "name", "email"],
        })
      : null;

    const [starredBoard] = await withStars(req.user.id, [board]);

    return res.status(200).json({
      success: true,
      board: starredBoard,
      role: roleLabel(role),
      isShared: role !== "OWNER",
      owner,
    });
  } catch (error) {
    console.log("Get Board Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const filterBoardCards = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      keyword,
      completed,
      incomplete,
      overdue,
      nextWeek,
      nextMonth,
      labels,
    } = req.query;

    const board = await Board.findByPk(id, {
      include: [
        {
          model: List,
          as: "lists",
          where: { isArchived: false },
          required: false,
          include: [
            {
              model: Card,
              as: "cards",
              where: { isArchived: false },
              required: false,
              include: [
                {
                  model: User,
                  as: "members",
                  attributes: ["id", "name", "email"],
                  through: { attributes: [] },
                },
                {
                  model: Checklist,
                  include: [{ model: ChecklistItem }],
                },
                {
                  model: Attachment,
                },
                {
                  // Only the ids: the card shows how many comments it has
                  model: Comment,
                  attributes: ["id"],
                },
                {
                  model: Label,
                  attributes: ["id", "name", "color"],
                  through: { attributes: [] },
                },
              ],
            },
          ],
        },
      ],
    });

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
    }

    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const nextWeekDate = new Date(endOfToday);
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);

    const nextMonthDate = new Date(endOfToday);
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);

    const filteredLists = board.lists
      .map((list) => {
        const filteredCards = list.cards.filter((card) => {
          let match = true;

          if (completed === "true") {
            match = match && card.isCompleted === true;
          }

          if (incomplete === "true") {
            match = match && card.isCompleted === false;
          }

          if (overdue === "true") {
            match =
              match &&
              card.dueDate &&
              new Date(card.dueDate) < startOfToday &&
              !card.isCompleted;
          }

          if (nextWeek === "true") {
            match =
              match &&
              card.dueDate &&
              new Date(card.dueDate) >= startOfToday &&
              new Date(card.dueDate) <= nextWeekDate;
          }

          if (nextMonth === "true") {
            match =
              match &&
              card.dueDate &&
              new Date(card.dueDate) > nextWeekDate &&
              new Date(card.dueDate) <= nextMonthDate;
          }

          if (labels) {
            const selectedLabels = Array.isArray(labels)
              ? labels.map(Number)
              : [Number(labels)];

            const cardLabelIds = (card.Labels || []).map((l) => l.id);

            match =
              match && selectedLabels.some((id) => cardLabelIds.includes(id));
          }

          if (keyword) {
  const search = keyword.toLowerCase();

  const titleMatch = card.title
    ?.toLowerCase()
    .includes(search);

  const descriptionMatch = card.description
    ?.toLowerCase()
    .includes(search);

  match = match && (titleMatch || descriptionMatch);
}
          return match;
        });

        return {
          ...list.toJSON(),
          cards: filteredCards,
        };
      })
      .filter((list) => list.cards.length > 0);

    return res.status(200).json({
      success: true,
      board: {
        ...board.toJSON(),
        lists: filteredLists,
      },
    });
  } catch (error) {
    console.log("Filter Board Cards Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const toggleStarBoard = async (req, res) => {
  try {
    const { id } = req.params;

    const board = await Board.findByPk(id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // Anyone who can see a board may star it for themselves
    const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
    }

    const existing = await BoardStar.findOne({
      where: { boardId: board.id, userId: req.user.id },
    });

    // The client says which state it wants, so a repeated or racing click
    // can't flip it back. Without a value it simply toggles.
    const wanted =
      typeof req.body?.starred === "boolean" ? req.body.starred : !existing;

    if (wanted && !existing) {
      await BoardStar.create({ boardId: board.id, userId: req.user.id });
    } else if (!wanted && existing) {
      await existing.destroy();
    }

    const isStarred = wanted;

    return res.status(200).json({
      success: true,
      message: isStarred ? "Board starred" : "Star removed",
      isStarred,
      board: { ...board.toJSON(), isStarred },
    });
  } catch (error) {
    console.log("Toggle star error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
// GET /boards/starred - every board I starred, own or shared with me
const getStarredBoards = async (req, res) => {
  try {
    const stars = await BoardStar.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Board,
          required: true,
          include: [
            {
              model: Workspace,
              as: "workspace",
              attributes: ["id", "name", "userId"],
              required: true,
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const boardIds = stars.map((star) => star.boardId);

    const memberships = boardIds.length
      ? await BoardMember.findAll({
          where: { userId: req.user.id, boardId: { [Op.in]: boardIds } },
          attributes: ["boardId", "role"],
        })
      : [];

    const roleByBoard = new Map(memberships.map((m) => [m.boardId, m.role]));

    const ownerIds = [
      ...new Set(stars.map((star) => star.Board.workspace.userId)),
    ];
    const owners = ownerIds.length
      ? await User.findAll({
          where: { id: { [Op.in]: ownerIds } },
          attributes: ["id", "name", "email"],
        })
      : [];
    const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

    const boards = stars
      .map((star) => {
        const board = star.Board;
        const isOwner = board.workspace.userId === req.user.id;
        const role = isOwner ? "OWNER" : roleByBoard.get(board.id);

        // A star on a board the user can no longer open is not shown
        if (!role) return null;

        const owner = ownerById.get(board.workspace.userId);

        return {
          id: board.id,
          name: board.name,
          background: board.background,
          workspaceId: board.workspaceId,
          workspaceName: board.workspace.name,
          isStarred: true,
          role: roleLabel(role),
          isShared: !isOwner,
          owner: owner
            ? { id: owner.id, name: owner.name, email: owner.email }
            : null,
        };
      })
      .filter(Boolean);

    return res.status(200).json({ success: true, boards });
  } catch (error) {
    console.log("Get Starred Boards Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET /boards/all - every board I can open: mine and shared with me
const getAllBoards = async (req, res) => {
  try {
    const boardIds = await getAccessibleBoardIds(req.user.id);

    if (boardIds.length === 0) {
      return res.status(200).json({ success: true, boards: [] });
    }

    const boards = await Board.findAll({
      where: { id: { [Op.in]: boardIds } },
      include: [
        {
          model: Workspace,
          as: "workspace",
          attributes: ["id", "name", "userId"],
          required: true,
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const [memberships, stars] = await Promise.all([
      BoardMember.findAll({
        where: { userId: req.user.id, boardId: { [Op.in]: boardIds } },
        attributes: ["boardId", "role"],
      }),
      starredSet(req.user.id, boardIds),
    ]);

    const roleByBoard = new Map(memberships.map((m) => [m.boardId, m.role]));

    const ownerIds = [...new Set(boards.map((b) => b.workspace.userId))];
    const owners = await User.findAll({
      where: { id: { [Op.in]: ownerIds } },
      attributes: ["id", "name", "email"],
    });
    const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

    const result = boards.map((board) => {
      const isOwner = board.workspace.userId === req.user.id;
      const owner = ownerById.get(board.workspace.userId);

      return {
        id: board.id,
        name: board.name,
        background: board.background,
        workspaceId: board.workspaceId,
        workspaceName: board.workspace.name,
        createdAt: board.createdAt,
        isStarred: stars.has(board.id),
        role: roleLabel(isOwner ? "OWNER" : roleByBoard.get(board.id)),
        isShared: !isOwner,
        owner: owner
          ? { id: owner.id, name: owner.name, email: owner.email }
          : null,
      };
    });

    return res.status(200).json({ success: true, boards: result });
  } catch (error) {
    console.log("Get All Boards Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET /boards/:id/archived - what was archived on a board, newest first
const getArchivedItems = async (req, res) => {
  try {
    const board = await Board.findByPk(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
    }

    const [lists, cards] = await Promise.all([
      List.findAll({
        where: { boardId: board.id, isArchived: true },
        attributes: ["id", "name", "archivedAt"],
        include: [{ model: Card, as: "cards", attributes: ["id"] }],
        order: [["archivedAt", "DESC"]],
      }),
      Card.findAll({
        where: { isArchived: true },
        attributes: ["id", "title", "dueDate", "isCompleted", "coverImage", "listId", "archivedAt"],
        include: [
          {
            model: List,
            attributes: ["id", "name"],
            required: true,
            where: { boardId: board.id, isArchived: false },
          },
        ],
        order: [["archivedAt", "DESC"]],
      }),
    ]);

    return res.status(200).json({
      success: true,
      lists: lists.map((list) => ({
        id: list.id,
        name: list.name,
        archivedAt: list.archivedAt,
        cardCount: list.cards.length,
      })),
      cards: cards.map((card) => ({
        id: card.id,
        title: card.title,
        dueDate: card.dueDate,
        isCompleted: card.isCompleted,
        coverImage: card.coverImage,
        archivedAt: card.archivedAt,
        listId: card.listId,
        listName: card.List.name,
      })),
    });
  } catch (error) {
    console.log("Get Archived Items Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getArchivedItems,
  getAllBoards,
  getStarredBoards,
  createBoard,
  getBoards,
  updateBoard,
  deleteBoard,
  getBoardById,
  searchBoards,
  toggleStarBoard,
  filterBoardCards,
};
