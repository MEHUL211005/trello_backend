const Board = require("./Board");
const User = require("./User");
const Workspace = require("./Workspace");
const List = require("./List");
const Card = require("./Card");
const Label = require("./Label");
const Comment = require("./Comment");
const Checklist = require("./Checklist");
const ChecklistItem = require("./ChecklistItem");
const Activity = require("./Activity");
const Attachment = require("./Attachment");
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

Card.belongsToMany(User , {
  through: "CardMembers",
  foreignKey: "cardId",
});
User.belongsToMany(Card , {
  through: "CardMembers",
  foreignKey: "UserId",
});

// Card -> Comments
Card.hasMany(Comment, {
  foreignKey: "cardId",
  onDelete: "CASCADE",
});

Comment.belongsTo(Card, {
  foreignKey: "cardId",
});

// User -> Comments
User.hasMany(Comment, {
  foreignKey: "userId",
  onDelete: "CASCADE",
});

Comment.belongsTo(User, {
  foreignKey: "userId",
});

// Card -> Checklists
Card.hasMany(Checklist, {
  foreignKey: "cardId",
  onDelete: "CASCADE",
});

Checklist.belongsTo(Card, {
  foreignKey: "cardId",
});

// Checklist -> Items
Checklist.hasMany(ChecklistItem, {
  foreignKey: "checklistId",
  onDelete: "CASCADE",
});

ChecklistItem.belongsTo(Checklist, {
  foreignKey: "checklistId",
});


User.hasMany(Activity, {
  foreignKey: "userId",
});

Activity.belongsTo(User, {
  foreignKey: "userId",
});


Card.hasMany(Activity, {
  foreignKey: "cardId",
  onDelete: "CASCADE",
});

Activity.belongsTo(Card, {
  foreignKey: "cardId",
});

Card.hasMany(Attachment, {
  foreignKey: "cardId",
  onDelete: "CASCADE",
});

Attachment.belongsTo(Card, {
  foreignKey: "cardId",
});

module.exports = {
  User,
  Workspace,
  Board,
  List,
  Card,
  Label,
  Comment,
  Checklist,
  ChecklistItem,
  Activity,
  Attachment,
};