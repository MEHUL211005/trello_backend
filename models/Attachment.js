const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Attachment = sequelize.define("Attachment", {
  originalName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  fileName: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  fileUrl: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  mimeType: {
    type: DataTypes.STRING,
  },

  size: {
    type: DataTypes.INTEGER,
  },
});

module.exports = Attachment;