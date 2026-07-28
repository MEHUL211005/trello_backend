const Card = require("../models/Card");
const List = require("../models/List");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");

const createCard = async (req, res) => {
  try {
    let {
      title,
      description,
      dueDate,
      position,
      listId,
    } = req.body;

    // Validation
    if (!title || !listId) {
      return res.status(400).json({
        success: false,
        message: "Title and List ID are required",
      });
    }

    title = title.trim();

    // Find List
    const list = await List.findByPk(listId);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // Verify ownership
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

    // Create card
    const card = await Card.create({
      title,
      description,
      dueDate,
      position,
      listId,
    });

    return res.status(201).json({
      success: true,
      message: "Card created successfully",
      card,
    });

  } catch (error) {

    console.log("Create Card Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const getCards = async (req, res) => {
  try {

    const { listId } = req.params;

    // Find List
    const list = await List.findByPk(listId);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // Verify ownership
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

    // Get cards
    const cards = await Card.findAll({
      where: {
        listId,
      },
      order: [["position", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      cards,
    });

  } catch (error) {

    console.log("Get Cards Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const getSingleCard = async (req, res) => {
  try {

    const { id } = req.params;

    // Find card
    const card = await Card.findByPk(id);

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

    return res.status(200).json({
      success: true,
      card,
    });

  } catch (error) {

    console.log("Get Single Card Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const updateCard = async (req, res) => {
  try {

    const { id } = req.params;

    let {
      title,
      description,
      dueDate,
      position,
      isCompleted,
      listId,
    } = req.body;

    // Find card
    const card = await Card.findByPk(id);

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

    // Update only provided fields
    if (title !== undefined) card.title = title.trim();
    if (description !== undefined) card.description = description;
    if (dueDate !== undefined) card.dueDate = dueDate;
    if (position !== undefined) card.position = position;
    if (isCompleted !== undefined) card.isCompleted = isCompleted;
    if (listId !== undefined) card.listId = listId;

    await card.save();

    return res.status(200).json({
      success: true,
      message: "Card updated successfully",
      card,
    });

  } catch (error) {

    console.log("Update Card Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const deleteCard = async (req, res) => {
  try {

    const { id } = req.params;

    const card = await Card.findByPk(id);

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

    await card.destroy();

    return res.status(200).json({
      success: true,
      message: "Card deleted successfully",
    });

  } catch (error) {

    console.log("Delete Card Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
module.exports = {
  createCard,
  getCards,
  getSingleCard,
  updateCard,
  deleteCard,
};