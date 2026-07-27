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
});

module.exports = List;