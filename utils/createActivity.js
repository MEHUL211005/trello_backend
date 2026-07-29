const Activity = require("../models/Activity");

const createActivity = async (action, cardId, userId) => {
  try {

    // console.log("Creating activity:", action, cardId, userId);

    await Activity.create({
      action,
      cardId,
      userId,
    });

    // console.log("Activity created successfully");

  } catch (error) {

    console.log("Create Activity Error:", error);

  }
};

module.exports = createActivity;