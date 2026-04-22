const express = require("express");
const { getUsers, getUserById } = require("../controllers/userControllers");
const router = express.Router();
const { verifyJwt } = require("../middleware/jwtMiddleware");

router.get("/", verifyJwt, getUsers);

router.get("/:id", verifyJwt, getUserById);

module.exports = router;
