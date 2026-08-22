const express = require("express");
const router = express.Router();
const requireLicense = require("../middleware/requireLicense");

const APP_TYPE = process.env.APP_TYPE || "quick_nest";

const {
  convertDaskeValueToS3D,
} = require("../controllers/convertDaskeValueToS3D");

router.post(
  "/convertDaske",
  requireLicense(APP_TYPE),
  convertDaskeValueToS3D
);

module.exports = router;
