const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const List = sequelize.define("List", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  position: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  // Archived lists leave the board but keep every card inside them
  isArchived: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },

  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = List;