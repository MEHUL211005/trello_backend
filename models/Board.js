const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Board = sequelize.define("Board", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  background: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

module.exports = Board;