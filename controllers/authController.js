const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { acceptPendingInvitations } = require("../utils/invitations");
const sendEmail = require("../utils/sendEmail");
const { otpEmail, resetPasswordEmail } = require("../utils/emailTemplates");
const appUrl = require("../utils/appUrl");
const {
  validateEmail,
  validateName,
  validatePassword,
} = require("../utils/validators");

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const RESET_TTL_MINUTES = 30;

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

// The OTP is only 6 digits, so it is hashed with a server secret and the
// user id to make a leaked hash useless for guessing offline
const hashOtp = (userId, otp) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId}:${otp}`)
    .digest("hex");

const safeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// Seconds left before another OTP may be sent (0 when allowed)
const otpCooldownSeconds = (user) => {
  if (!user.otpSentAt) return 0;
  const elapsed = (Date.now() - new Date(user.otpSentAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(OTP_RESEND_SECONDS - elapsed));
};

// Create a fresh OTP for the user and email it. Does nothing if one was
// sent within the cooldown, so repeated requests cannot spam the inbox.
const issueOtp = async (user) => {
  if (otpCooldownSeconds(user) > 0) return;

  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");

  user.otpHash = hashOtp(user.id, otp);
  user.otpExpires = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  user.otpSentAt = new Date();
  user.otpAttempts = 0;
  await user.save();

  await sendEmail({
    to: user.email,
    ...otpEmail({ name: user.name, otp, minutes: OTP_TTL_MINUTES }),
  });
};

const isProduction = process.env.NODE_ENV === "production";

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
    const body = req.body || {};

    // Remove extra spaces
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = normalizeEmail(body.email);
    const password =
      typeof body.password === "string" ? body.password.trim() : "";

    const validationError =
      validateName(name) || validateEmail(email) || validatePassword(password);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    // Check if email already exists
    let user = await User.findOne({
      where: { email },
    });

    // A verified account owns the email. An unverified one is a signup that
    // was never finished, so it is simply started again below.
    if (user && user.isVerified) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      user.name = name;
      user.password = hashedPassword;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        password: hashedPassword,
      });
    }

    // Email the OTP (skipped if one was sent a moment ago)
    try {
      await issueOtp(user);
    } catch (mailError) {
      return res.status(502).json({
        success: false,
        message: "We could not send the verification email. Please try again.",
      });
    }

    // Success Response
    return res.status(201).json({
      success: true,
      message: "Account created. Enter the OTP sent to your email.",
      data: {
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
    const body = req.body || {};

    // Clean data
    const email = normalizeEmail(body.email);
    const password =
      typeof body.password === "string" ? body.password.trim() : "";

    // Required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

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

    // The account must be verified (OTP) before it can log in
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email with the OTP before logging in",
        email: user.email,
      });
    }

    // Generate tokens
const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);

// Save refresh token in DB (and remember this sign-in)
const firstLogin = !user.lastLoginAt;
user.refreshToken = refreshToken;
user.lastLoginAt = new Date();
await user.save();

// Send refresh token as HttpOnly cookie
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Success Response
return res.status(200).json({
  success: true,
  message: "Login successful",
  firstLogin,
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
      return res.status(401).json({
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
    return res.status(401).json({
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
      secure: isProduction,
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
// PUT /auth/profile - change the display name
const updateProfile = async (req, res) => {
  try {
    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";

    const nameError = validateName(name);
    if (nameError) {
      return res.status(400).json({ success: false, message: nameError });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.name = name;
    await user.save();

    return res.json({
      success: true,
      message: "Profile updated",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// POST /auth/change-password - needs the current password
// (a wrong current password is a 400, not a 401: a 401 would make the app
// think the session expired and sign the person out)
const changePassword = async (req, res) => {
  try {
    const clean = (value) => (typeof value === "string" ? value.trim() : "");
    const currentPassword = clean(req.body?.currentPassword);
    const newPassword = clean(req.body?.newPassword);
    const confirmPassword = clean(req.body?.confirmPassword);

    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Enter your current password",
      });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({
        success: false,
        message: "Your current password is incorrect",
      });
    }

    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({
        success: false,
        message: "Choose a password you haven't used here before",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    // Old sign-ins stop working; this device stays signed in
    const refreshToken = generateRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Password updated",
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    const inputError =
      validateEmail(email) ||
      (!otp && "Please enter the 6-digit OTP") ||
      (!/^\d{6}$/.test(otp) && "OTP must be exactly 6 digits");

    if (inputError) {
      return res.status(400).json({
        success: false,
        message: inputError,
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    if (user.isVerified) {
      return res.json({
        success: true,
        message: "Email is already verified",
      });
    }

    if (!user.otpHash || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many wrong attempts. Please request a new OTP.",
      });
    }

    if (!safeEqual(user.otpHash, hashOtp(user.id, otp))) {
      user.otpAttempts += 1;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "Incorrect OTP",
      });
    }

    user.isVerified = true;
    user.otpHash = null;
    user.otpExpires = null;
    user.otpSentAt = null;
    user.otpAttempts = 0;
    await user.save();

    // Boards shared with this email before they signed up become theirs now
    const sharedBoards = await acceptPendingInvitations(user);

    return res.json({
      success: true,
      message: "OTP verification successful",
      sharedBoards,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const resendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: validateEmail(email),
      });
    }

    const user = await User.findOne({ where: { email } });

    // Same answer whether or not the account exists
    const genericResponse = {
      success: true,
      message: "If the account needs verification, a new OTP has been sent",
    };

    if (!user || user.isVerified) {
      return res.json(genericResponse);
    }

    const waitSeconds = otpCooldownSeconds(user);

    if (waitSeconds > 0) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds}s before requesting another OTP`,
        retryAfter: waitSeconds,
      });
    }

    try {
      await issueOtp(user);
    } catch (mailError) {
      return res.status(502).json({
        success: false,
        message: "We could not send the email. Please try again.",
      });
    }

    return res.json(genericResponse);
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: validateEmail(email),
      });
    }

    // Same answer whether or not the account exists, so emails can't be probed
    const genericResponse = {
      success: true,
      message: "If an account exists for this email, a reset link has been sent",
    };

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.json(genericResponse);
    }

    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = sha256(token);
    user.resetPasswordExpires = new Date(
      Date.now() + RESET_TTL_MINUTES * 60 * 1000
    );
    await user.save();

    const link = `${appUrl()}/reset-password/${token}`;

    try {
      await sendEmail({
        to: user.email,
        ...resetPasswordEmail({
          name: user.name,
          link,
          minutes: RESET_TTL_MINUTES,
        }),
      });
    } catch (mailError) {
      return res.status(502).json({
        success: false,
        message: "We could not send the email. Please try again.",
      });
    }

    return res.json(genericResponse);
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.body;
    const password = String(req.body.password || "").trim();
    const confirmPassword = String(req.body.confirmPassword || "").trim();

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Reset link is invalid",
      });
    }

    const passwordError = validatePassword(password);

    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const user = await User.findOne({
      where: {
        resetPasswordToken: sha256(token),
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This reset link is invalid or has expired",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    // Following the emailed link proves they own the address, and any
    // existing sessions must stop working
    user.isVerified = true;
    user.refreshToken = null;
    await user.save();
    await acceptPendingInvitations(user);

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getProfile,
  updateProfile,
  changePassword,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
};