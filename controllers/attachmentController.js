const Attachment = require("../models/Attachment");
const { getCardAccess, canRead, canWrite, denied } = require("../utils/boardAccess");
const createActivity = require("../utils/createActivity");
const fs = require("fs");
const path = require("path");

const uploadAttachment = async (req, res) => {
  try {

    const { cardId } = req.params;

    // console.log("CARD ID:", cardId); 

    // multer has already written the file, so remove it if we reject
    const discardUpload = () => {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
    };

    const { card, role } = await getCardAccess(req.user.id, cardId);

    if (!card) {
      discardUpload();
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    if (!canWrite(role)) {
      discardUpload();
      return denied(res);
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const attachment = await Attachment.create({
      originalName: req.file.originalname,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      cardId: Number(cardId),
    });

    await createActivity(`attached "${attachment.originalName}"`, card.id, req.user.id);

    return res.status(201).json({
      success: true,
      attachment,
    });

  } catch (error) {

    console.log("Upload Attachment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const getAttachments = async (req, res) => {
  try {

    const { cardId } = req.params;

    const { card, role } = await getCardAccess(req.user.id, cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    if (!canRead(role)) {
      return denied(res);
    }

    const attachments = await Attachment.findAll({
      where: { cardId },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      attachments,
    });

  } catch (error) {

    console.log("Get Attachments Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};

const deleteAttachment = async (req, res) => {
  try {

    const { id } = req.params;

    const attachment = await Attachment.findByPk(id);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    const { card, role } = await getCardAccess(req.user.id, attachment.cardId);

    if (!canWrite(role)) {
      return denied(res);
    }

    // A deleted picture must not stay behind as the card's cover
    if (card && card.coverImage === attachment.fileUrl) {
      card.coverImage = null;
      await card.save();
    }

    const filePath = path.join(
      __dirname,
      "..",
      "uploads",
      path.basename(attachment.fileName)
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await attachment.destroy();

    await createActivity(`removed the attachment "${attachment.originalName}"`, attachment.cardId, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
    });

  } catch (error) {

    console.log("Delete Attachment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
const setAttachmentAsCover = async (req, res) => {
  try {

    const { id } = req.params;

    const attachment = await Attachment.findByPk(id);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    const { card, role } = await getCardAccess(req.user.id, attachment.cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    if (!canWrite(role)) {
      return denied(res);
    }

    // Set cover image
    card.coverImage = attachment.fileUrl;

    await card.save();

    await createActivity("set a new cover image", card.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: "Attachment set as cover",
      coverImage: card.coverImage,
    });

  } catch (error) {

    console.log("Set Cover Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};
module.exports = {
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  setAttachmentAsCover,
};
