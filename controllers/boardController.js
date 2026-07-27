const Board = require("../models/Board");
const Workspace = require("../models/Workspace");

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
      message: "Internal Server Error"
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
module.exports = {
  createBoard,
  getBoards,
  updateBoard,
  deleteBoard
};