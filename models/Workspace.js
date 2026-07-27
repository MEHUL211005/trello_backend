const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Workspace = sequelize.define("Workspace", {

  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

});

module.exports = Workspace;