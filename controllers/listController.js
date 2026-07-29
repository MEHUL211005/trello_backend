const List = require("../models/List");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");

const createList = async (req, res) => {
  try {
    let { name, position, boardId } = req.body;

    // Required Fields
    if (!name || !boardId) {
      return res.status(400).json({
        success: false,
        message: "Name and Board ID are required",
      });
    }

    // Remove extra spaces
    name = name.trim();

    // Find Board
    const board = await Board.findByPk(boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // Verify Workspace Ownership
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

    // Create List
    const list = await List.create({
      name,
      position,
      boardId,
    });

    return res.status(201).json({
      success: true,
      message: "List created successfully",
      list,
    });

  } catch (error) {
    console.log("Create List Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getLists = async (req, res) => {
  try {
    const { boardId } = req.params;

    // Find Board
    const board = await Board.findByPk(boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: "Board not found",
      });
    }

    // Verify Ownership
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

    // Get Lists
    const lists = await List.findAll({
      where: {
        boardId,
      },
      order: [["position", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      lists,
    });
  } catch (error) {
    console.log("Get Lists Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const updateList = async (req, res) => {
  try {
    const { id } = req.params;
    let { name, position } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "List name is required",
      });
    }

    name = name.trim();

    const list = await List.findByPk(id);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

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

    list.name = name;
    list.position = position;

    await list.save();

    return res.status(200).json({
      success: true,
      message: "List updated successfully",
      list,
    });
  } catch (error) {
    console.log("Update List Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const deleteList = async (req, res) => {
  try {
    const { id } = req.params;

    const list = await List.findByPk(id);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

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

    await list.destroy();

    return res.status(200).json({
      success: true,
      message: "List deleted successfully",
    });
  } catch (error) {
    console.log("Delete List Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const reorderLists = async (req, res) => {
  try {

    const { lists } = req.body;

    if (!Array.isArray(lists) || lists.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lists array is required",
      });
    }

    for (const list of lists) {

      await List.update(
        {
          position: list.position,
        },
        {
          where: { id: list.id },
        }
      );

    }

    return res.status(200).json({
      success: true,
      message: "Lists reordered successfully",
    });

  } catch (error) {

    console.log("Reorder Lists Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
module.exports = {
  createList,
  getLists,
  updateList,
  deleteList,
  reorderLists,
};