const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ChecklistItem = sequelize.define("ChecklistItem", {
  text: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = ChecklistItem;