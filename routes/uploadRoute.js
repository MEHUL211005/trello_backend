const express = require("express");
const router = express.Router();

const upload = require("../middlewares/uploadMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

router.post(
  "/image",
  authMiddleware,
  upload.single("file"),
  (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        success:false,
        message:"No image uploaded"
      });
    }

    return res.status(200).json({
      success:true,
      url:`/uploads/${req.file.filename}`
    });

  }
);


module.exports = router;