const Checklist = require("../models/Checklist");
const Card = require("../models/Card");
const List = require("../models/List");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");
const ChecklistItem = require("../models/ChecklistItem");
const createActivity = require("../utils/createActivity");

const createChecklist = async (req, res) => {
  try {

    const { cardId } = req.params;
    const { title } = req.body;

    // Validate title
    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Checklist title is required",
      });
    }

    // Find card
    const card = await Card.findByPk(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Ownership verification
    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);

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

    // Create checklist
    const checklist = await Checklist.create({
      title: title.trim(),
      cardId,
    });

    return res.status(201).json({
      success: true,
      checklist,
    });

  } catch (error) {

    console.log("Create Checklist Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};

const getChecklists = async (req, res) => {
  try {

    const { cardId } = req.params;

    // Find card
    const card = await Card.findByPk(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Ownership verification
    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);

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

    // Get checklists with items
    const checklists = await Checklist.findAll({
      where: { cardId },
      include: [
        {
          model: ChecklistItem,
          attributes: ["id", "text", "completed"],
        },
      ],
      order: [
        ["createdAt", "ASC"],
        [ChecklistItem, "createdAt", "ASC"],
      ],
    });

    return res.status(200).json({
      success: true,
      checklists,
    });

  } catch (error) {

    console.log("Get Checklists Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const addChecklistItem = async (req, res) => {
  try {

    const { checklistId } = req.params;
    const { text } = req.body;

    // Validate text
    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Item text is required",
      });
    }

    // Find checklist
    const checklist = await Checklist.findByPk(checklistId);

    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: "Checklist not found",
      });
    }

    // Ownership verification
    const card = await Card.findByPk(checklist.cardId);
    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);

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

    // Create item
    const item = await ChecklistItem.create({
      text: text.trim(),
      checklistId,
    });

    return res.status(201).json({
      success: true,
      item,
    });

  } catch (error) {

    console.log("Add Checklist Item Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const toggleChecklistItem = async (req, res) => {
  try {

    const { itemId } = req.params;

    // Find item
    const item = await ChecklistItem.findByPk(itemId, {
      include: [
        {
          model: Checklist,
          include: [
            {
              model: Card,
            },
          ],
        },
      ],
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Checklist item not found",
      });
    }

    // Ownership verification
    const list = await List.findByPk(item.Checklist.Card.listId);
    const board = await Board.findByPk(list.boardId);

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

    // Toggle completed
    item.completed = !item.completed;

    await item.save();

    await createActivity(
  item.completed
    ? "completed a checklist item"
    : "unchecked a checklist item",
  item.Checklist.cardId,
  req.user.id
);

    return res.status(200).json({
      success: true,
      item,
    });

  } catch (error) {

    console.log("Toggle Checklist Item Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const updateChecklistItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Item text is required",
      });
    }

    const item = await ChecklistItem.findByPk(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Checklist item not found",
      });
    }

    item.text = text.trim();

    await item.save();

    return res.status(200).json({
      success: true,
      item,
    });

  } catch (error) {

    console.log("Update Checklist Item Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const deleteChecklistItem = async (req, res) => {
  try {

    const { itemId } = req.params;

    const item = await ChecklistItem.findByPk(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Checklist item not found",
      });
    }

    await item.destroy();

    return res.status(200).json({
      success: true,
      message: "Checklist item deleted successfully",
    });

  } catch (error) {

    console.log("Delete Checklist Item Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const updateChecklist = async (req, res) => {
  try {

    const { checklistId } = req.params;
    const { title } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Checklist title is required",
      });
    }

    const checklist = await Checklist.findByPk(checklistId);

    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: "Checklist not found",
      });
    }

    checklist.title = title.trim();

    await checklist.save();

    return res.status(200).json({
      success: true,
      checklist,
    });

  } catch (error) {

    console.log("Update Checklist Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const deleteChecklist = async (req, res) => {
  try {

    const { checklistId } = req.params;

    const checklist = await Checklist.findByPk(checklistId);

    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: "Checklist not found",
      });
    }

    await checklist.destroy();

    return res.status(200).json({
      success: true,
      message: "Checklist deleted successfully",
    });

  } catch (error) {

    console.log("Delete Checklist Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const getChecklistProgress = async (req, res) => {
  try {

    const { checklistId } = req.params;

    const checklist = await Checklist.findByPk(checklistId, {
      include: [ChecklistItem],
    });

    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: "Checklist not found",
      });
    }

    const total = checklist.ChecklistItems.length;

    const completed = checklist.ChecklistItems.filter(
      item => item.completed
    ).length;

    const remaining = total - completed;

    const percentage = total === 0
      ? 0
      : Math.round((completed / total) * 100);

    return res.status(200).json({
      success: true,
      progress: {
        total,
        completed,
        remaining,
        percentage,
      },
    });

  } catch (error) {

    console.log("Checklist Progress Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
module.exports = {
  createChecklist,
  getChecklists,
  addChecklistItem,
  toggleChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  updateChecklist,
  deleteChecklist,
  getChecklistProgress
};