const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");

const {
  registerUser,
  loginUser,
} = require("../controllers/authController");

router.post("/register", registerUser);

router.post("/login", loginUser);

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