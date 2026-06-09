const express = require("express");
const {
  createEvent,
  getUsageByLicenseName,
  getUsageEventsByLicenseName,
  getLicenseInfoByDeviceId,
} = require("../controllers/eventControllers");
const verifyInternalApiKey = require("../middleware/verifyInternalApiKey");

const router = express.Router();

router.post("/create_event", createEvent);
router.get(
  "/usage/by-license-name",
  verifyInternalApiKey,
  getUsageByLicenseName,
);
router.get(
  "/usage/events/by-license-name",
  verifyInternalApiKey,
  getUsageEventsByLicenseName,
);
router.get(
  "/license/by-device",
  verifyInternalApiKey,
  getLicenseInfoByDeviceId,
);

module.exports = router;
