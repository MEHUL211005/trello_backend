const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("../models/User");
const Feedback = require("../models/Feedback");
const List = require("../models/List");
const Card = require("../models/Card");

// sequelize.sync() never alters existing tables, so add any columns that a
// table created earlier is still missing.
const USER_COLUMNS = {
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verificationToken: { type: DataTypes.STRING, allowNull: true },
  otpHash: { type: DataTypes.STRING, allowNull: true },
  otpExpires: { type: DataTypes.DATE, allowNull: true },
  otpSentAt: { type: DataTypes.DATE, allowNull: true },
  otpAttempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  resetPasswordToken: { type: DataTypes.STRING, allowNull: true },
  resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },
  refreshToken: { type: DataTypes.TEXT, allowNull: true },
};

const FEEDBACK_COLUMNS = {
  category: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "OTHER",
  },
};

const ARCHIVE_COLUMNS = {
  isArchived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  archivedAt: { type: DataTypes.DATE, allowNull: true },
};

const ensureColumns = async (model, columns) => {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable(model.getTableName());

  for (const [name, definition] of Object.entries(columns)) {
    if (!table[name]) {
      await queryInterface.addColumn(model.getTableName(), name, definition);
      console.log(`Added ${model.name}.${name}`);
    }
  }
};

const ensureUserColumns = async () => {
  await ensureColumns(User, USER_COLUMNS);
  await ensureColumns(Feedback, FEEDBACK_COLUMNS);
  await ensureColumns(List, ARCHIVE_COLUMNS);
  await ensureColumns(Card, ARCHIVE_COLUMNS);
};

module.exports = ensureUserColumns;
