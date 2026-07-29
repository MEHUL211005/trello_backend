const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Checklist = sequelize.define("Checklist", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = Checklist;