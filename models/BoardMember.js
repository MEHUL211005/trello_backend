const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const BoardMember = sequelize.define(
  "BoardMember",
  {
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    role: {
      type:DataTypes.ENUM("OWNER", "MEMBER", "VIEWER"),
      allowNull: false,
      defaultValue: "MEMBER",
    },
  },
  {
    tableName: "BoardMembers",
    timestamps: true,
  }
);

module.exports = BoardMember;