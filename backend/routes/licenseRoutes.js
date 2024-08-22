const express = require("express");

const {
  getLicenses,
  getLicensesById,
  createLicense,
  deleteLicense,
  authorizeLicense,
  checkDeviceRegistration,
} = require("../controllers/licensesControllers");
const isDeviceRegistered = require("../middleware/authMiddleware");
const verifyAdmin = require("../middleware/verifyAdmin");

const router = express.Router();

router.get("/", verifyAdmin, getLicenses);
router.get("/:id", verifyAdmin, getLicensesById);
router.post("/", verifyAdmin, createLicense);
router.delete("/:licenseKey", verifyAdmin, deleteLicense);

// autorizacija
router.post("/authorize/:licenseKey", authorizeLicense);

// registracija uredaja
router.post("/check-device", checkDeviceRegistration);

router.get("/csv-loader", isDeviceRegistered, (req, res) => {
  res.json({ message: "Welcome to the CSVLoader" });
});

module.exports = router;
