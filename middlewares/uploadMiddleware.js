const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Anything not listed here (svg, html, js, exe, ...) is rejected
const ALLOWED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/zip": [".zip"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    ".pptx",
  ],
};

// Images are identified by their type, not their file name: pasted
// screenshots and "copy image" often arrive with no extension (or "blob").
// The stored extension comes from the type, so it always matches the content.
const IMAGE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    const extension =
      IMAGE_EXTENSIONS[file.mimetype] ||
      path.extname(file.originalname).toLowerCase();

    cb(null, uniqueName + extension);
  },
});

const fileFilter = (req, file, cb) => {
  if (IMAGE_EXTENSIONS[file.mimetype]) {
    return cb(null, true);
  }

  // Other kinds of image (svg, heic, avif, ...) are not supported
  if (file.mimetype.startsWith("image/")) {
    const error = new Error("Only JPG, PNG, GIF and WebP images are supported");
    error.status = 400;
    return cb(error);
  }

  const extensions = ALLOWED_TYPES[file.mimetype];
  const extension = path.extname(file.originalname).toLowerCase();

  if (!extensions || !extensions.includes(extension)) {
    const error = new Error("This file type is not allowed");
    error.status = 400;
    return cb(error);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = upload;
