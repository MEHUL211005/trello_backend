const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  registerUser,
  loginUser,
  verifyEmail,
} = require("../controllers/authController");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get('/verify-email/:token', verifyEmail);

router.get(
  "/profile",
  authMiddleware,
  (req,res)=>{
    res.json({
      success:true,
      user:req.user
    });
  }
);

module.exports = router;