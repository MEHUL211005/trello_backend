const express = require("express");
const cors = require("cors");
require("dotenv").config();

const sequelize = require("./config/database");

const User = require("./models/User");
const Workspace = require("./models/Workspace");
const List = require("./models/List");
const Board = require("./models/Board");
require("./models/associations");

const authRoutes = require("./routes/authRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const boardRoutes = require("./routes/boardRoutes")
const listRoutes = require("./routes/listRoutes");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/boards" , boardRoutes);
app.use("/api/lists", listRoutes);
sequelize
  .authenticate()
  .then(async () => {
    console.log("Database Connected");

  await sequelize.sync();

    console.log("Tables Synced");
  })
  .catch(console.error);

module.exports = app;