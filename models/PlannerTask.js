const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// A personal task on the Planner. Every task belongs to exactly one user and
// is only ever visible to them.
const PlannerTask = sequelize.define(
  "PlannerTask",
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

    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Calendar day, "YYYY-MM-DD", with no time zone attached
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // Optional time of day, "HH:MM" (24 hours)
    time: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },

    isDone: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    indexes: [{ fields: ["userId", "date"] }],
  }
);

module.exports = PlannerTask;
