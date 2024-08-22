const express = require("express");

const { checkAdminAccess } = require("../controllers/checkAdminAccess");

const router = express.Router();

router.post("/superAuth", checkAdminAccess);

module.exports = router;
