const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Label = sequelize.define("Label", {
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  color: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Label;