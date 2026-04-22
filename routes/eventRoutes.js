const express = require("express");
const {
  createEvent,
  getUsageByLicenseName,
  getUsageEventsByLicenseName,
  getLicenseInfoByDeviceId,
} = require("../controllers/eventControllers");

const router = express.Router();

router.post("/create_event", createEvent);
router.get("/usage/by-license-name", getUsageByLicenseName);
router.get("/usage/events/by-license-name", getUsageEventsByLicenseName);
router.get("/license/by-device", getLicenseInfoByDeviceId);

module.exports = router;
