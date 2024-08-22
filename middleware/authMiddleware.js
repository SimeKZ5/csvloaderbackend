const License = require("../models/licensesSchema");

const isDeviceRegistered = async (req, res, next) => {
  try {
    const deviceId = req.headers["x-device-id"] || req.query.deviceId;

    if (!deviceId) {
      return res.status(401).json({ message: "Device ID is required" });
    }

    const license = await License.findOne({ machineId: deviceId });

    if (license && license.licenseUsed && license.machineId === deviceId) {
      return next();
    }

    return res
      .status(403)
      .json({ message: "Access denied: Device not registered" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = isDeviceRegistered;
