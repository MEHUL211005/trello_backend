const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const sequelize = require("./config/database");

const User = require("./models/User");
const Workspace = require("./models/Workspace");
const List = require("./models/List");
const Board = require("./models/Board");
const Card = require("./models/Card");
const Label = require("./models/Label");
require("./models/associations");

const authRoutes = require("./routes/authRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const boardRoutes = require("./routes/boardRoutes")
const listRoutes = require("./routes/listRoutes");
const cardRoutes = require ("./routes/cardRoutes");
const labelRoutes = require("./routes/labelRoutes");
const memberRoutes = require("./routes/memberRoutes");
const commentRoutes = require("./routes/commentRoutes");
const checklistRoutes = require("./routes/checklistRoutes");
const activityRoutes = require("./routes/activityRoutes");
const attachmentRoutes = require("./routes/attachmentRoutes");

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/boards" , boardRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/cards" , cardRoutes);
app.use("/api/labels" , labelRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/comments" , commentRoutes);
app.use("/api/checklists" , checklistRoutes);
app.use("/api/activities" , activityRoutes);
app.use("/api/attachments" , attachmentRoutes);
sequelize
  .authenticate()
  .then(async () => {
    console.log("Database Connected");

  await sequelize.sync();
  // await sequelize.sync({ alter: true });

    console.log("Tables Synced");
  })
  .catch(console.error);

module.exports = app;