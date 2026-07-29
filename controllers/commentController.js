const Comment = require("../models/Comment");
const Card = require("../models/Card");
const List = require("../models/List");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");
const User = require("../models/User");
const createActivity = require("../utils/createActivity");

const addComment = async (req, res) => {
  try {

    const { cardId } = req.params;
    const { text } = req.body;

    // Validate text
    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
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

    // Create comment
    const comment = await Comment.create({
      text: text.trim(),
      cardId,
      userId: req.user.id,
    });
    await createActivity(
  "added a comment",
  cardId,
  req.user.id
);
    return res.status(201).json({
      success: true,
      comment,
    });

  } catch (error) {

    console.log("Add Comment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const getComments = async (req, res) => {
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

    // Get comments with author
    const comments = await Comment.findAll({
      where: { cardId },
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      comments,
    });

  } catch (error) {

    console.log("Get Comments Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const deleteComment = async (req, res) => {
  try {

    const { id } = req.params;

    // Find comment
    const comment = await Comment.findByPk(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Only owner can delete
    if (comment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can delete only your own comments",
      });
    }

    await comment.destroy();

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });

  } catch (error) {

    console.log("Delete Comment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Comment text is required",
      });
    }

    const comment = await Comment.findByPk(id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can edit only your own comments",
      });
    }

    comment.text = text.trim();

    await comment.save();

    return res.status(200).json({
      success: true,
      comment,
    });

  } catch (error) {
    console.log("Update Comment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
module.exports = {
  addComment,
  getComments,
  deleteComment,
  updateComment,
};