const { getBoardRole, canRead, canWrite, denied } = require("../utils/boardAccess");
const Label = require("../models/Label");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");

const createLabel = async (req, res) => {
  try {

    let { name, color, boardId } = req.body;

    // Validation
    if (!color || !boardId) {
      return res.status(400).json({
        success: false,
        message: "Color and Board ID are required",
      });
    }

    if (name) {
      name = name.trim();
    }

    // Find board
    const board = await Board.findByPk(boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // Verify ownership
    const role = await getBoardRole(req.user.id, board);
    if (!canWrite(role)) {
      return denied(res);
    }

    // Prevent duplicate colors in same board
    const existingLabel = await Label.findOne({
      where: {
        color,
        boardId,
      },
    });

    if (existingLabel) {
      return res.status(400).json({
        success: false,
        message: "This color already exists in the board",
      });
    }

    // Create label
    const label = await Label.create({
      name,
      color,
      boardId,
    });

    return res.status(201).json({
      success: true,
      message: "Label created successfully",
      label,
    });

  } catch (error) {

    console.log("Create Label Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const Card = require("../models/Card");
const createActivity = require("../utils/createActivity");

const List = require("../models/List");

const toggleLabel = async (req, res) => {
  try {

    const { cardId, labelId } = req.params;

    // Find card
    const card = await Card.findByPk(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Find label
    const label = await Label.findByPk(labelId);

    if (!label) {
      return res.status(404).json({
        success: false,
        message: "Label not found",
      });
    }

    // Ownership verification
    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);

    const role = await getBoardRole(req.user.id, board);
    if (!canWrite(role)) {
      return denied(res);
    }

    // Check if label already attached
    const existing = await card.hasLabel(label);

    if (existing) {

      // Remove label
      await card.removeLabel(label);
      await createActivity(`removed the label "${label.name}"`, card.id, req.user.id);

      return res.status(200).json({
        success: true,
        attached: false,
        message: "Label removed from card",
      });

    } else {

      // Add label
      await card.addLabel(label);
      await createActivity(`added the label "${label.name}"`, card.id, req.user.id);

      return res.status(200).json({
        success: true,
        attached: true,
        message: "Label added to card",
      });

    }

  } catch (error) {

    console.log("Toggle Label Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const getBoardLabels = async (req, res) => {
  try {

    const { boardId } = req.params;

    // Find board
    const board = await Board.findByPk(boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // Verify ownership
    const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
    }

    // Get labels of this board
    const labels = await Label.findAll({
      where: {
        boardId,
      },
      order: [["createdAt", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      labels,
    });

  } catch (error) {

    console.log("Get Board Labels Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const getCardLabels = async (req, res) => {
  try {

    const { cardId } = req.params;

    // Find card with its labels
    const card = await Card.findByPk(cardId, {
      include: [
        {
          model: Label,
          through: { attributes: [] }, // hide junction table
        },
      ],
    });

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Ownership verification
    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);

    const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
    }

    return res.status(200).json({
      success: true,
      labels: card.Labels,
    });

  } catch (error) {

    console.log("Get Card Labels Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
module.exports = {
  createLabel,
  toggleLabel,
  getBoardLabels,
  getCardLabels, 
};