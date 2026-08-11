const { Op } = require("sequelize");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");
const List = require("../models/List");
const Card = require("../models/Card");
const Checklist = require("../models/Checklist");
const ChecklistItem = require("../models/ChecklistItem");
const User = require("../models/User");
const Attachment = require("../models/Attachment");
const Label = require("../models/Label");
const BoardMember = require ("../models/BoardMember");
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
  board,
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
        boards,
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
      boards,
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
    const { name, background } = req.body;

    if (!name) {
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
    const workspace = await Workspace.findOne({
      where: {
        id: board.workspaceId,
        userId: req.user.id,
      },
    });

    if (!workspace) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    board.name = name.trim();
    board.background = background;

    await board.save();

    return res.status(200).json({
      success: true,
      message: "Board updated successfully",
      board,
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

    const workspace = await Workspace.findOne({
      where: {
        id: board.workspaceId,
        userId: req.user.id,
      },
    });

    if (!workspace) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
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

    const userWorkspaces = await Workspace.findAll({
      where: {
        userId: req.user.id,
      },
      attributes: ["id"],
    });

    const workspaceIds = userWorkspaces.map((workspace) => workspace.id);

    const boards = await Board.findAll({
      where: {
        workspaceId: {
          [Op.in]: workspaceIds,
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
      boards,
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
          include: [
            {
              model: Card,
              as: "cards",
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

    // Check if user owns the workspace
    const workspace = await Workspace.findOne({
      where: {
        id: board.workspaceId,
        userId: req.user.id,
      },
    });

    // Owner has access
    if (workspace) {
      return res.status(200).json({
        success: true,
        board,
      });
    }

    // Check if user is a member of this board
    const boardMember = await BoardMember.findOne({
      where: {
        boardId: board.id,
        userId: req.user.id,
      },
    });

    if (!boardMember) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Board member has access
    return res.status(200).json({
      success: true,
      board,
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
          include: [
            {
              model: Card,
              as: "cards",
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

    const workspace = await Workspace.findOne({
      where: {
        id: board.workspaceId,
        userId: req.user.id,
      },
    });

    if (!workspace) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
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

    board.isStarred = !board.isStarred;

    await board.save();

    return res.status(200).json({
      success: true,
      message: "Board star updated",
      board,
    });
  } catch (error) {
    console.log("Toggle star error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
const inviteToBoard = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role = "MEMBER" } = req.body;

    // 1. Find board
    const board = await Board.findByPk(id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // 2. Check requester membership
    const requesterMembership = await BoardMember.findOne({
      where: {
        boardId: id,
        userId: req.user.id,
      },
    });

    if (!requesterMembership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this board",
      });
    }

    // 3. Only OWNER can invite
    if (requesterMembership.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the board owner can invite members",
      });
    }

    // 4. Only MEMBER and VIEWER can be invited
    if (!["MEMBER", "VIEWER"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid board role",
      });
    }

    // 5. Find invited user
    const user = await User.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    // 6. Prevent self invite
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot invite yourself",
      });
    }

    // 7. Check if already a member
    const existingMember = await BoardMember.findOne({
      where: {
        boardId: id,
        userId: user.id,
      },
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a board member",
      });
    }

    // 8. Create membership
    const member = await BoardMember.create({
      boardId: id,
      userId: user.id,
      role,
    });

    return res.status(201).json({
      success: true,
      message: "Member invited successfully",
      member,
    });
  } catch (error) {
    console.error("Invite member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to invite member",
    });
  }
};
const getBoardMembers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check board exists
    const board = await Board.findByPk(id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // Check requester is a board member
    const requesterMembership = await BoardMember.findOne({
      where: {
        boardId: id,
        userId: req.user.id,
      },
    });

    if (!requesterMembership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this board",
      });
    }

    // Get all board members
    const members = await BoardMember.findAll({
      where: {
        boardId: id,
      },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],
      order: [
        ["role", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      members,
    });
  } catch (error) {
    console.error("Get Board Members Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get board members",
    });
  }
};
module.exports = {
  createBoard,
  getBoards,
  updateBoard,
  deleteBoard,
  getBoardById,
  searchBoards,
  toggleStarBoard,
  filterBoardCards,
  inviteToBoard,
  getBoardMembers,
};
