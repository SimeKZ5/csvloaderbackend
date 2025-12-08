const express = require("express");
const { createEvent } = require("../controllers/eventControllers");

const router = express.Router();

router.post("/create_event", createEvent);

module.exports = router;
