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

  const cards = await Card.findAll({

  where: { listId },


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

    if (title !== undefined) {

      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Title cannot be empty",
        });
      }

      card.title = title.trim();
    }
if (description !== undefined) {
  card.description = description;

  await createActivity(
    "updated the description",
    card.id,
    req.user.id
  );
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
      card.isCompleted = isCompleted;
    }

    if (listId !== undefined) {
      card.listId = listId;
    }

    if (coverImage !== undefined) {
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

// UPDATE DUE DATE
const updateDueDate = async (req, res) => {
  try {

    const { id } = req.params;
    const { dueDate } = req.body;

    const card = await Card.findByPk(id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
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

    const cards = await Card.findAll({
  where: {
    title: {
      [Op.like]: `%${query}%`,
    },
  },
  include: [
    {
      model: List,
      attributes: ["id", "name"],
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


  for (const item of cards) {

  await Card.update(
    {
      listId: item.listId,
      position: item.position,
    },
    {
      where:{
        id:item.id
      }
    }
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

    const card = await Card.findByPk(id);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    card.isCompleted = !card.isCompleted;

    await card.save();

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
module.exports = {
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