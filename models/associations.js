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
const Feedback = require("./Feedback");
const PlannerTask = require("./PlannerTask");
const BoardMember = require("./BoardMember");
const BoardInvitation = require("./BoardInvitation");
const BoardStar = require("./BoardStar");
// User -> Workspace
User.hasMany(Workspace, {
  foreignKey: "userId",
  onDelete: "CASCADE",
});

// Workspace -> User
Workspace.belongsTo(User, {
  foreignKey: "userId",
});

// hooks: true makes Sequelize delete the children itself, so existing
// tables (whose foreign keys were created without CASCADE) are cleaned up too
Workspace.hasMany(Board,{
 foreignKey:"workspaceId",
 as:"boards",
 onDelete:"CASCADE",
 hooks:true,
});

Board.belongsTo(Workspace,{
 foreignKey:"workspaceId",
 as:"workspace"
});

Board.hasMany(List, {
  foreignKey: "boardId",
  as: "lists",
  onDelete: "CASCADE",
  hooks: true,
});

List.belongsTo(Board, {
  foreignKey: "boardId",
});

List.hasMany(Card, {
  foreignKey: "listId",
  onDelete: "CASCADE",
  hooks: true,
  as: "cards",
});

Card.belongsTo(List, {
  foreignKey: "listId",
});

// Board -> Label
Board.hasMany(Label, {
  foreignKey: "boardId",
  onDelete: "CASCADE",
  hooks: true,
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
  as:"members",
});


User.belongsToMany(Card , {
  through:"CardMembers",
  foreignKey:"userId",
  as:"cards",
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

User.hasMany(Feedback,{
  foreignKey:"userId",
  as:"feedbacks",
});


Feedback.belongsTo(User,{
  foreignKey:"userId",
  as:"user",
});

// Planner tasks go away with their owner
User.hasMany(PlannerTask, {
  foreignKey: "userId",
  as: "plannerTasks",
  onDelete: "CASCADE",
});

PlannerTask.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Board.hasMany(BoardMember, {
  foreignKey: "boardId",
  as: "boardMembers",
  onDelete: "CASCADE",
  hooks: true,
});

BoardMember.belongsTo(Board, {
  foreignKey: "boardId",
});

User.hasMany(BoardMember, {
  foreignKey: "userId",
  as: "boardMemberships",
});

BoardMember.belongsTo(User, {
  foreignKey: "userId",
});
Board.hasMany(BoardInvitation, {
  foreignKey: "boardId",
  as: "invitations",
  onDelete: "CASCADE",
  hooks: true,
});
BoardInvitation.belongsTo(Board, {
  foreignKey: "boardId",
});
BoardInvitation.belongsTo(User, {
  foreignKey: "invitedBy",
  as: "inviter",
});

Board.hasMany(BoardStar, {
  foreignKey: "boardId",
  as: "stars",
  onDelete: "CASCADE",
  hooks: true,
});
BoardStar.belongsTo(Board, {
  foreignKey: "boardId",
});
BoardStar.belongsTo(User, {
  foreignKey: "userId",
});
User.hasMany(BoardStar, {
  foreignKey: "userId",
  onDelete: "CASCADE",
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
  Feedback,
  PlannerTask,
  BoardMember,
};