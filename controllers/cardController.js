const {
  getBoardRole,
  getBoardRoleById,
  getCardAccess,
  getAccessibleBoardIds,
  canRead,
  canWrite,
  denied,
} = require("../utils/boardAccess");
const sequelize = require("../config/database");
const { Op } = require("sequelize");

const Card = require("../models/Card");
const List = require("../models/List");
const Board = require("../models/Board");
const Workspace = require("../models/Workspace");
const createActivity = require("../utils/createActivity");
const Checklist = require("../models/Checklist");
const ChecklistItem = require("../models/ChecklistItem");
// CREATE CARD
const createCard = async (req, res) => {
  try {
    let {
      title,
      description,
      dueDate,
      position,
      listId,
      coverImage,
    } = req.body;

    if (!title || !listId) {
      return res.status(400).json({
        success: false,
        message: "Title and List ID are required",
      });
    }

    title = title.trim();

    const list = await List.findByPk(listId);

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

    // Put the card at the end of the list unless a position was given
    if (position === undefined || position === null) {
      const lastPosition = await Card.max("position", { where: { listId } });
      position = (lastPosition ?? -1) + 1;
    }

    const card = await Card.create({
      title,
      description,
      dueDate,
      position,
      listId,
      coverImage,
    });
    await createActivity(
    "created this card",
     card.id,
    req.user.id
    );
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

// GET CARDS BY LIST
const getCards = async (req, res) => {
  try {

    const { listId } = req.params;

    const list = await List.findByPk(listId);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: "List not found",
      });
    }

    const board = await Board.findByPk(list.boardId);

    const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
    }

  const cards = await Card.findAll({

  where: { listId, isArchived: false },


  include:[
    {
      model: Checklist,

      include:[
        {
          model: ChecklistItem,
          attributes:[
            "id",
            "text",
            "completed"
          ]
        }
      ]

    }
  ],


  order: [
    ["position", "ASC"]
  ]

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

// GET SINGLE CARD
const getSingleCard = async (req, res) => {
  try {

    const { id } = req.params;


    const card = await Card.findByPk(id, {

      include: [
        {
          model: Checklist,

          include: [
            {
              model: ChecklistItem,
              attributes: [
                "id",
                "text",
                "completed"
              ],
            },
          ],

        },
      ],

    });



    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }



    const list = await List.findByPk(card.listId);


    const board = await Board.findByPk(list.boardId);



    const role = await getBoardRole(req.user.id, board);
    if (!canRead(role)) {
      return denied(res);
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

// UPDATE CARD (PATCH STYLE)
const updateCard = async (req, res) => {
  try {

    const { id } = req.params;

    const {
      title,
      description,
      dueDate,
      position,
      isCompleted,
      listId,
      coverImage,
    } = req.body;

    const card = await Card.findByPk(id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);

    const role = await getBoardRole(req.user.id, board);
    if (!canWrite(role)) {
      return denied(res);
    }

    // Update only provided fields

    if (title !== undefined) {

      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }

      if (card.title !== title.trim()) {
        await createActivity(
          `renamed this card from "${card.title}" to "${title.trim()}"`,
          card.id,
          req.user.id
        );
      }

      card.title = title.trim();
    }
if (description !== undefined) {
  if ((card.description || "") !== (description || "")) {
    await createActivity(
      description ? "updated the description" : "removed the description",
      card.id,
      req.user.id
    );
  }

  card.description = description;
}

if (dueDate !== undefined) {
  card.dueDate = dueDate;

  await createActivity(
    "changed the due date",
    card.id,
    req.user.id
  );
}
    if (position !== undefined) {
      card.position = position;
    }

    if (isCompleted !== undefined) {
      if (card.isCompleted !== isCompleted) {
        await createActivity(
          isCompleted ? "marked this card complete" : "marked this card incomplete",
          card.id,
          req.user.id
        );
      }

      card.isCompleted = isCompleted;
    }

    if (listId !== undefined && Number(listId) !== card.listId) {
      // A card can only be moved to another list on the same board
      const targetList = await List.findByPk(listId);

      if (!targetList || targetList.boardId !== list.boardId) {
        return res.status(400).json({
          success: false,
          message: "Invalid target list",
        });
      }

      await createActivity(
        `moved this card from "${list.name}" to "${targetList.name}"`,
        card.id,
        req.user.id
      );

      card.listId = targetList.id;
    }

    if (coverImage !== undefined) {
      if ((card.coverImage || "") !== (coverImage || "")) {
        await createActivity(
          coverImage ? "changed the cover image" : "removed the cover image",
          card.id,
          req.user.id
        );
      }

      card.coverImage = coverImage;
    }

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

// DELETE CARD
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

    const list = await List.findByPk(card.listId);
    const board = await Board.findByPk(list.boardId);

    const role = await getBoardRole(req.user.id, board);
    if (!canWrite(role)) {
      return denied(res);
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

// UPDATE DUE DATE
const updateDueDate = async (req, res) => {
  try {

    const { id } = req.params;
    const { dueDate } = req.body;

    const { card, role } = await getCardAccess(req.user.id, id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    if (!canWrite(role)) {
      return denied(res);
    }

    card.dueDate = dueDate;

await createActivity(
  "changed the due date",
  card.id,
  req.user.id
);

await card.save();

    return res.status(200).json({
      success: true,
      card,
    });

  } catch (error) {

    console.log("Update Due Date Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};

// SEARCH CARDS
const searchCards = async (req, res) => {
  try {

    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
      });
    }

    // Only search boards the user can access
    const boardIds = await getAccessibleBoardIds(req.user.id);

    const cards = await Card.findAll({
  where: {
    isArchived: false,
    title: {
      [Op.like]: `%${query.trim()}%`,
    },
  },
  include: [
    {
      model: List,
      attributes: ["id", "name"],
      required: true,
      where: { boardId: { [Op.in]: boardIds }, isArchived: false },
      include: [
        {
          model: Board,
          attributes: ["id", "name"],
        },
      ],
    },
  ],
  order: [["createdAt", "DESC"]],
});

    return res.status(200).json({
      success: true,
      count: cards.length,
      cards,
    });

  } catch (error) {

    console.log("Search Cards Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const reorderCards = async (req, res) => {
  try {

    const { cards } = req.body;

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cards array is required",
      });
    }


    const isValidItem = (item) =>
      item &&
      Number.isInteger(Number(item.id)) &&
      Number.isInteger(Number(item.position)) &&
      (item.listId === undefined ||
        item.listId === null ||
        Number.isInteger(Number(item.listId)));

    if (!cards.every(isValidItem)) {
      return res.status(400).json({
        success: false,
        message: "Each card needs an id and a position",
      });
    }

    // Load the cards being moved
    const cardIds = cards.map((item) => Number(item.id));

    const dbCards = await Card.findAll({
      where: { id: { [Op.in]: cardIds } },
      include: [List],
    });

    // A card with no listId stays in the list it is already in
    const currentListOf = new Map(dbCards.map((card) => [card.id, card.listId]));
    const targetListOf = (item) =>
      item.listId === undefined || item.listId === null
        ? currentListOf.get(Number(item.id))
        : Number(item.listId);

    const targetListIds = [
      ...new Set(cards.map(targetListOf).filter((id) => id !== undefined)),
    ];

    const targetLists = await List.findAll({
      where: { id: { [Op.in]: targetListIds } },
    });

    if (
      dbCards.length !== new Set(cardIds).size ||
      targetLists.length !== targetListIds.length
    ) {
      return res.status(404).json({
        success: false,
        message: "Card or list not found",
      });
    }

    // Every card must be on a board the user can edit, and may only
    // move to a list on that same board
    const boardOfList = new Map(targetLists.map((l) => [l.id, l.boardId]));
    const roleByBoard = new Map();

    for (const card of dbCards) {
      const boardId = card.List.boardId;

      if (!roleByBoard.has(boardId)) {
        const { role } = await getBoardRoleById(req.user.id, boardId);
        roleByBoard.set(boardId, role);
      }

      const item = cards.find((c) => Number(c.id) === card.id);

      if (
        !canWrite(roleByBoard.get(boardId)) ||
        boardOfList.get(targetListOf(item)) !== boardId
      ) {
        return denied(res);
      }
    }

    const listNameOf = new Map(targetLists.map((l) => [l.id, l.name]));
    const moves = cards
      .map((item) => ({ card: dbCards.find((c) => c.id === Number(item.id)), to: targetListOf(item) }))
      .filter(({ card, to }) => card && card.listId !== to);

    await sequelize.transaction(async (transaction) => {
      for (const item of cards) {
        await Card.update(
          {
            listId: targetListOf(item),
            position: Number(item.position),
          },
          {
            where: { id: Number(item.id) },
            transaction,
          }
        );
      }
    });


    for (const { card, to } of moves) {
      await createActivity(
        `moved this card from "${card.List.name}" to "${listNameOf.get(to)}"`,
        card.id,
        req.user.id
      );
    }

    return res.status(200).json({
      success: true,
      message: "Cards reordered successfully",
    });


  } catch(error){

    console.log("Reorder Cards Error:", error);

    return res.status(500).json({
      success:false,
      message:"Internal Server Error",
    });

  }
};
const toggleCardCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    const { card, role } = await getCardAccess(req.user.id, id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    if (!canWrite(role)) {
      return denied(res);
    }

    card.isCompleted = !card.isCompleted;

    await card.save();

    await createActivity(
      card.isCompleted ? "marked this card complete" : "marked this card incomplete",
      card.id,
      req.user.id
    );

    return res.status(200).json({
      success: true,
      card,
    });

  } catch (error) {
    console.log("Toggle Card Completed Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ARCHIVE / RESTORE CARD  (body: { archived: true | false })
// Nothing is removed: description, attachments, checklists, labels, members
// and comments all stay with the card.
const setCardArchived = async (req, res) => {
  try {
    const { id } = req.params;
    const archived = req.body?.archived !== false;

    const { card, list, role } = await getCardAccess(req.user.id, id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    if (!canWrite(role)) {
      return denied(res);
    }

    if (!archived && list.isArchived) {
      return res.status(409).json({
        success: false,
        message: `Restore the list "${list.name}" first`,
      });
    }

    if (card.isArchived !== archived) {
      card.isArchived = archived;
      card.archivedAt = archived ? new Date() : null;

      if (!archived) {
        // A restored card returns at the bottom of its list
        const last = await Card.max("position", {
          where: { listId: card.listId, isArchived: false },
        });
        card.position = (last ?? -1) + 1;
      }

      await card.save();

      await createActivity(
        archived ? "archived this card" : "restored this card",
        card.id,
        req.user.id
      );
    }

    return res.status(200).json({
      success: true,
      message: archived ? "Card archived" : "Card restored",
      card,
    });
  } catch (error) {
    console.log("Archive Card Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  setCardArchived,
  createCard,
  getCards,
  getSingleCard,
  updateCard,
  deleteCard,
  updateDueDate,
  searchCards,
  reorderCards,
  toggleCardCompleted,
};