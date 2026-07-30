const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const upload = require("../middlewares/uploadMiddleware");

const {
  uploadAttachment,
  getAttachments,
  deleteAttachment
} = require("../controllers/attachmentController");

router.post(
  "/cards/:cardId",
  authMiddleware,
  upload.single("file"),
  uploadAttachment
);

router.get("/cards/:cardId" , authMiddleware , getAttachments);
router.delete("/:id" , authMiddleware , deleteAttachment);
module.exports = router;