const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

// An invitation to a board for an email address that has no account yet.
// When that person signs up and verifies their email, it is turned into a
// BoardMember and marked ACCEPTED.
const BoardInvitation = sequelize.define(
  "BoardInvitation",
  {
    boardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // Stored with the same values as BoardMember.role (MEMBER = "Editor")
    role: {
      type: DataTypes.ENUM("MEMBER", "VIEWER"),
      allowNull: false,
      defaultValue: "MEMBER",
    },

    status: {
      type: DataTypes.ENUM("PENDING", "ACCEPTED", "REVOKED"),
      allowNull: false,
      defaultValue: "PENDING",
    },

    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "BoardInvitations",
    timestamps: true,
    indexes: [{ unique: true, fields: ["boardId", "email"] }],
  }
);

module.exports = BoardInvitation;
