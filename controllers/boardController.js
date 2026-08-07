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

    // Check workspace ownership
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

    // Get all boards
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
module.exports = {
  createBoard,
  getBoards,
  updateBoard,
  deleteBoard,
  getBoardById,
  searchBoards,
  toggleStarBoard,
  filterBoardCards,
};
