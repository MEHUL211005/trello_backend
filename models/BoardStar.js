const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// A board a user has starred. Stars belong to the person, so starring a
// shared board does not change it for anyone else.
const BoardStar = sequelize.define(
  "BoardStar",
  {
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "BoardStars",
    timestamps: true,
    indexes: [{ unique: true, fields: ["boardId", "userId"] }],
  }
);

module.exports = BoardStar;
