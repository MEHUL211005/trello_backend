const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '15m',
    }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: '7d',
    }
  );
};
//register
const registerUser = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Remove extra spaces
    name = name.trim();
    email = email.trim().toLowerCase();
    password = password.trim();

    // Name Validation
    if (name.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 3 characters",
      });
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    // Password Validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Generate verification token
const verificationToken = crypto.randomBytes(32).toString("hex");
    // Create User
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      verificationToken,
    });
// Verification URL
const verifyUrl = `http://localhost:5000/api/auth/verify-email/${verificationToken}`;

// Send verification email
await sendEmail({
  to: email,
  subject: "Verify your Trello account",
  html: `
    <h2>Welcome to Trello </h2>
    <p>Please verify your email by clicking the button below:</p>

    <a href="${verifyUrl}"
       style="
         display:inline-block;
         padding:12px 24px;
         background:#2563eb;
         color:white;
         text-decoration:none;
         border-radius:6px;
         font-weight:bold;
       ">
       Verify Email
    </a>

    <p>If the button does not work, copy this link:</p>
    <p>${verifyUrl}</p>
  `,
});
    // Success Response
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (error) {
    console.error("Register Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    // Required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Clean data
    email = email.trim().toLowerCase();
    password = password.trim();

    // Find user
    const user = await User.findOne({
      where: {
        email,
      },
    });

    // User not found
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate tokens
const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);

// Save refresh token in DB
user.refreshToken = refreshToken;
await user.save();

// Send refresh token as HttpOnly cookie
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: false, // change to true in production with HTTPS
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Success Response
return res.status(200).json({
  success: true,
  message: "Login successful",
  accessToken,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
  },
});
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
const refreshAccessToken = async (req, res) => {
  try {
    // Read refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // Find user
    const user = await User.findByPk(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Create new access token
    const newAccessToken = generateAccessToken(user);

    return res.json({
      success: true,
      accessToken: newAccessToken,
    });

  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};
const logoutUser = async (req, res) => {
  try {
    // Read refresh token from cookie
    const refreshToken = req.cookies.refreshToken;

    // Remove refresh token from DB
    if (refreshToken) {
      const user = await User.findOne({
        where: { refreshToken },
      });

      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    // Clear cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    return res.json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "createdAt", "updatedAt"],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      user,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).send("Invalid or expired verification link");
    }

    user.isVerified = true;
    user.verificationToken = null;

    await user.save();

    return res.send("Email verified successfully 🎉");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Server error");
  }
};
module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getProfile,
  verifyEmail,
};