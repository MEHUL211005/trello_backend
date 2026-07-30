const Attachment = require("../models/Attachment");
const Card = require("../models/Card");
const fs = require("fs");
const path = require("path");

const uploadAttachment = async (req, res) => {
  try {

    const { cardId } = req.params;

    // console.log("CARD ID:", cardId); 

    const card = await Card.findByPk(cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
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

    const filePath = path.join(
      __dirname,
      "..",
      attachment.fileUrl
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await attachment.destroy();

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

    const card = await Card.findByPk(attachment.cardId);

    if (!card) {
      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    // Set cover image
    card.coverImage = attachment.fileUrl;

    await card.save();

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
