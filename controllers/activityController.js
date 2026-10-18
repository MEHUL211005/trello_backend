const Activity = require("../models/Activity");
const User = require("../models/User");
const { getCardAccess, canRead, denied } = require("../utils/boardAccess");

const getCardActivities = async (req, res) => {
  try {

    const { cardId } = req.params;

    const { card, role } = await getCardAccess(req.user.id, cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    if (!canRead(role)) {
      return denied(res);
    }

    const activities = await Activity.findAll({
      where: { cardId },

      include: [
        {
          model: User,
          attributes: ["id", "name"],
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      activities,
    });

  } catch (error) {

    console.log("Get Activities Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};

module.exports = {
  getCardActivities,
};