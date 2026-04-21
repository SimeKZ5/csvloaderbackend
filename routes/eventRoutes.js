const express = require("express");
const {
  createEvent,
  getUsageByLicenseName,
  getUsageEventsByLicenseName,
} = require("../controllers/eventControllers");

const router = express.Router();

router.post("/create_event", createEvent);
router.get("/usage/by-license-name", getUsageByLicenseName);
router.get("/usage/events/by-license-name", getUsageEventsByLicenseName);

module.exports = router;
