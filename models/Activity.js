const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Activity = sequelize.define("Activity", {

  action: {
    type: DataTypes.STRING,
    allowNull: false,
  },

});

module.exports = Activity;