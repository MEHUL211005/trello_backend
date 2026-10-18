const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Feedback = sequelize.define(
  "Feedback",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    // IDEA, BUG, PRAISE or OTHER
    category: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "OTHER",
    },

    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = Feedback;