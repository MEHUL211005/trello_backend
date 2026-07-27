const Board = require("./Board");
const User = require("./User");
const Workspace = require("./Workspace");
const List = require("./List");

// User -> Workspace
User.hasMany(Workspace, {
  foreignKey: "userId",
  onDelete: "CASCADE",
});

// Workspace -> User
Workspace.belongsTo(User, {
  foreignKey: "userId",
});

Workspace.hasMany(Board, {
  foreignKey: "workspaceId",
});

Board.belongsTo(Workspace, {
  foreignKey: "workspaceId",
});

Board.hasMany(List, {
  foreignKey: "boardId",
});

List.belongsTo(Board, {
  foreignKey: "boardId",
});
module.exports = {
  User,
  Workspace,
  Board,
  List
};