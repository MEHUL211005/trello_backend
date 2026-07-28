const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Card = sequelize.define("Card", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  isCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = Card;