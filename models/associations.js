const Board = require("./Board");
const User = require("./User");
const Workspace = require("./Workspace");
const List = require("./List");
const Card = require("./Card");
const Label = require("./Label");
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

List.hasMany(Card, {
  foreignKey : "listId",
  onDelete : "CASCADE",
});
Card.belongsTo(List , {
  foreignKey:"listId",
});

// Board -> Label
Board.hasMany(Label, {
  foreignKey: "boardId",
  onDelete: "CASCADE",
});

// Label -> Board
Label.belongsTo(Board, {
  foreignKey: "boardId",
});

// Card <-> Label
Card.belongsToMany(Label, {
  through: "CardLabels",
  foreignKey: "cardId",
});

Label.belongsToMany(Card, {
  through: "CardLabels",
  foreignKey: "labelId",
});

module.exports = {
  User,
  Workspace,
  Board,
  List,
  Card,
  Label,
};