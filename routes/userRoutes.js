const express = require("express");
const { getUsers, getUserById } = require("../controllers/userControllers");
const router = express.Router();
const verifyInternalApiKey = require("../middleware/verifyInternalApiKey");

router.get("/", verifyInternalApiKey, getUsers);

router.get("/:id", verifyInternalApiKey, getUserById);

module.exports = router;
