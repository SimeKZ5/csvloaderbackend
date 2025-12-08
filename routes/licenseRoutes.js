const express = require("express");

const {
  getLicenses,
  getLicensesById,
  createLicense,
  deactivateLicense,
  deleteLicense,
  authorizeLicense,
  checkDeviceRegistration,
  activateLicense,
} = require("../controllers/licensesControllers");
const isDeviceRegistered = require("../middleware/authMiddleware");
//const verifyAdmin = require("../middleware/verifyAdmin");
const { verifyJwt } = require("../middleware/jwtMiddleware");

const router = express.Router();

router.get("/", verifyJwt, /* verifyAdmin, */ getLicenses);
router.get("/:id", verifyJwt, /* verifyAdmin, */ getLicensesById);
router.post("/", verifyJwt, /* verifyAdmin, */ createLicense);
router.put(
  "/deactivate/:machineId/:type_of_licence",
  verifyJwt,
  /* verifyAdmin, */
  deactivateLicense
);
router.put(
  "/activate/:machineId/:type_of_licence",
  verifyJwt,
  /* verifyAdmin, */
  activateLicense
);
router.delete("/:licenseKey", verifyJwt, /* verifyAdmin, */ deleteLicense);

// autorizacija
router.post("/authorize/:licenseKey", authorizeLicense);

// registracija uredaja
router.post("/check-device", checkDeviceRegistration);

router.get("/csv-loader", isDeviceRegistered, (req, res) => {
  res.json({ message: "Welcome to the CSVLoader" });
});

module.exports = router;
