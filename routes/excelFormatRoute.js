const express = require("express");
const multer = require("multer");
const router = express.Router();
const upload = multer({ dest: "uploads/" });
const requireLicense = require("../middleware/requireLicense");

const APP_TYPE = process.env.APP_TYPE || "quick_nest";

const {
  convertExcelToS3D,
} = require("../controllers/excelConverterController");

router.post(
  "/uploads",
  requireLicense(APP_TYPE),
  upload.single("file"),
  convertExcelToS3D
);

module.exports = router;
