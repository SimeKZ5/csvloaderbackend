const express = require("express");
const multer = require("multer");
const router = express.Router();
const upload = multer({ dest: "uploads/" });

const {
  convertExcelToS3D,
} = require("../controllers/excelConverterController");
console.log(convertExcelToS3D);
router.post("/uploads", upload.single("file"), convertExcelToS3D);

module.exports = router;
