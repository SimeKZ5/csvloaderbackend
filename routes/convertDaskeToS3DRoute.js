const express = require("express");
const router = express.Router();

const {
  convertDaskeValueToS3D,
} = require("../controllers/convertDaskeValueToS3D");
router.post("/convertDaske", convertDaskeValueToS3D);

module.exports = router;
