const License = require("../models/licensesSchema");

const requireLicense = (typeOfLicence) => {
  return async (req, res, next) => {
    try {
      const deviceId = req.headers["x-device-id"];

      if (!deviceId) {
        return res.status(401).json({
          code: "DEVICE_ID_REQUIRED",
          message: "Device ID is required",
        });
      }

      const license = await License.findOne({
        machineId: deviceId,
        type_of_licence: typeOfLicence,
        licenseUsed: true,
        active: true,
      });

      if (!license) {
        console.warn("Possible licence bypass attempt", {
          deviceId,
          route: req.originalUrl,
          method: req.method,
          ip: req.ip,
          userAgent: req.get("user-agent"),
          timestamp: new Date().toISOString(),
        });

        return res.status(403).json({
          code: "LICENSE_BYPASS_DETECTED",
          message: "Licence validation failed",
        });
      }

      req.license = license;
      return next();
    } catch (error) {
      console.error("Licence validation failed:", error);

      return res.status(500).json({
        code: "LICENSE_CHECK_FAILED",
        message: "Server Error",
      });
    }
  };
};

module.exports = requireLicense;
