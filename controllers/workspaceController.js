const { Op } = require("sequelize");
const Workspace = require("../models/Workspace");
const Board = require("../models/Board");
const BoardMember = require("../models/BoardMember");
const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Workspace name is required",
      });
    }

    // Create workspace
    const workspace = await Workspace.create({
      name,
      description,
      userId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      workspace,
    });
  } catch (error) {
    console.log("Create Workspace Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getWorkspaces = async (req, res) => {
  try {
    // Workspaces owned by the user
    const ownedWorkspaces = await Workspace.findAll({
      where: {
        userId: req.user.id,
      },
      include: [
        {
          model: Board,
          as: "boards",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Workspaces where the user is a member of at least one board
    const sharedWorkspaces = await Workspace.findAll({
      include: [
        {
          model: Board,
          as: "boards",
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
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Merge and remove duplicates
    const workspaceMap = new Map();

    [...ownedWorkspaces, ...sharedWorkspaces].forEach((workspace) => {
      workspaceMap.set(workspace.id, workspace);
    });

    const workspaces = Array.from(workspaceMap.values());

    return res.status(200).json({
      success: true,
      workspaces,
    });
  } catch (error) {
    console.log("Get Workspaces Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findOne({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },

      include: [
        {
          model: Board,
          as: "boards",
        },
      ],
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    res.status(200).json({
      success: true,
      workspace,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
const updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Workspace name is required",
      });
    }

    // Find workspace of logged-in user
    const workspace = await Workspace.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // Update fields
    workspace.name = name;
    workspace.description = description;

    // Save changes
    await workspace.save();

    return res.status(200).json({
      success: true,
      message: "Workspace updated successfully",
      workspace,
    });
  } catch (error) {
    console.log("Update Workspace Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;

    // Find workspace of logged-in user
    const workspace = await Workspace.findOne({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // Delete workspace
    await workspace.destroy();

    return res.status(200).json({
      success: true,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    console.log("Delete Workspace Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const searchWorkspaces = async (req, res) => {
  try {
    const { query } = req.query;
    const trimmedQuery = query?.trim();

    if (!trimmedQuery) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    const workspaces = await Workspace.findAll({
      where: {
        userId: req.user.id,
        [Op.or]: [
          {
            name: {
              [Op.like]: `%${trimmedQuery}%`,
            },
          },
          {
            description: {
              [Op.like]: `%${trimmedQuery}%`,
            },
          },
        ],
      },
      include: [
        {
          model: Board,
          as: "boards",
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: workspaces.length,
      workspaces,
    });
  } catch (error) {
    console.log("Search Workspaces Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createWorkspace,
  getWorkspaces,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceById,
  searchWorkspaces,
};
