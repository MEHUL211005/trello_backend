const {
  getBoardRole,
  getBoardRoleById,
  canRead,
  canWrite,
  denied,
} = require("../utils/boardAccess");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
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
    const role = await getBoardRole(req.user.id, board);
    if (!canWrite(role)) {
      return denied(res);
    }

    // Put the list at the end of the board unless a position was given
    if (position === undefined || position === null) {
      const lastPosition = await List.max("position", { where: { boardId } });
      position = (lastPosition ?? -1) + 1;
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
    const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
    }

    // Get Lists
    const lists = await List.findAll({
      where: {
        boardId,
        isArchived: false,
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

    name = String(name).trim();

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "List name is required",
      });
    }

    const list = await List.findByPk(id);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    const board = await Board.findByPk(list.boardId);

    const role = await getBoardRole(req.user.id, board);
    if (!canWrite(role)) {
      return denied(res);
    }

    list.name = name;
    if (position !== undefined) {
      list.position = position;
    }

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

    const role = await getBoardRole(req.user.id, board);
    if (!canWrite(role)) {
      return denied(res);
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

    // console.log(lists);

    if (!Array.isArray(lists) || lists.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Lists array is required",
      });
    }

    const listIds = lists.map((item) => item.id);

    const dbLists = await List.findAll({
      where: { id: { [Op.in]: listIds } },
    });

    if (dbLists.length !== new Set(listIds.map(Number)).size) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    // The user must be able to edit every board the lists belong to
    for (const boardId of new Set(dbLists.map((l) => l.boardId))) {
      const { role } = await getBoardRoleById(req.user.id, boardId);

      if (!canWrite(role)) {
        return denied(res);
      }
    }

    await sequelize.transaction(async (transaction) => {
      for (const list of lists) {
        await List.update(
          {
            position: list.position,
          },
          {
            where: { id: list.id },
            transaction,
          }
        );
      }
    });

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

// ARCHIVE / RESTORE LIST  (body: { archived: true | false })
// The list's cards stay inside it, so restoring brings everything back.
const setListArchived = async (req, res) => {
  try {
    const { id } = req.params;
    const archived = req.body?.archived !== false;

    const list = await List.findByPk(id);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    const board = await Board.findByPk(list.boardId);

    const role = await getBoardRole(req.user.id, board);
    if (!canWrite(role)) {
      return denied(res);
    }

    if (list.isArchived !== archived) {
      list.isArchived = archived;
      list.archivedAt = archived ? new Date() : null;

      if (!archived) {
        // A restored list returns at the end of the board
        const last = await List.max("position", {
          where: { boardId: list.boardId, isArchived: false },
        });
        list.position = (last ?? -1) + 1;
      }

      await list.save();
    }

    return res.status(200).json({
      success: true,
      message: archived ? "List archived" : "List restored",
      list,
    });
  } catch (error) {
    console.log("Archive List Error:", error);

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
  setListArchived,
};