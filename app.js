// Must run first: later requires (models, database config) read process.env
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const rateLimit = require("./middlewares/rateLimit");
const realtimeNotify = require("./middlewares/realtimeNotify");
const requestLogger = require("./middlewares/requestLogger");
const app = express();

// First in line, so every request is logged, even the ones that are refused
app.use(requestLogger);
const sequelize = require("./config/database");

const User = require("./models/User");
const Workspace = require("./models/Workspace");
const List = require("./models/List");
const Board = require("./models/Board");
const Card = require("./models/Card");
const Label = require("./models/Label");
const BoardMember = require("./models/BoardMember");
require("./models/associations");

const cookieParser = require('cookie-parser');
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
const uploadRoute = require("./routes/uploadRoute");
const feedbackRoutes = require("./routes/feedbackRoutes");
const plannerRoutes = require("./routes/plannerRoutes");
// The client runs on another origin and loads images from /uploads
// SERVE_FRONTEND_DIR (live-demo mode, see below) serves the website from this
// server, whose page needs an inline theme script and web fonts
const serveFrontendDir = process.env.SERVE_FRONTEND_DIR;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    ...(serveFrontendDir ? { contentSecurityPolicy: false } : {}),
  })
);
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Slow down brute-force attempts on the credential endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many attempts, please try again in a few minutes",
});
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/verify-otp", authLimiter);
app.use("/api/auth/resend-otp", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api/auth/change-password", authLimiter);

// Tells people viewing a board when someone changes it (see realtime/socket.js)
app.use("/api", realtimeNotify);

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
app.use("/api/upload", uploadRoute);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/planner", plannerRoutes);

// Live-demo mode: with SERVE_FRONTEND_DIR set to the built website, this one
// server carries the site AND the API, so a single public link is enough.
// Off by default, so normal development is unchanged.
if (serveFrontendDir) {
  const frontendDir = path.resolve(serveFrontendDir);

  // Behind a tunnel/proxy: count visitors by their real address
  app.set("trust proxy", true);

  app.use(express.static(frontendDir));

  // Any other page address belongs to the single-page app
  app.use((req, res, next) => {
    if (
      req.method !== "GET" ||
      /^\/(api|uploads|socket\.io)(\/|$)/.test(req.path)
    ) {
      return next();
    }

    res.sendFile(path.join(frontendDir, "index.html"));
  });
}

// Upload errors (file too large, type not allowed) and anything unhandled
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: "File is too large (max 10 MB)",
    });
  }

  if (err.status === 400 || err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});
sequelize
  .authenticate()
  .then(async () => {
    console.log("Database Connected");

  await sequelize.sync();
  await require("./utils/ensureUserColumns")();
  await require("./utils/stars").migrateLegacyStars();
  // await sequelize.sync({ alter: true });

    console.log("Tables Synced");
  })
  .catch(console.error);

module.exports = app;