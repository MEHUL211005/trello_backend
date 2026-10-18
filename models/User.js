const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // Email verification
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Signup OTP (only a hash of the code is stored)
    otpHash: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    otpExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    otpSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    otpAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    // Forgot password
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // When they last signed in (empty until the first sign-in)
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    refreshToken: {
    type: DataTypes.TEXT,
    allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = User;
 