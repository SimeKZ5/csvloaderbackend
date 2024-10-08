const License = require("../models/licensesSchema");
const { nanoid } = require("nanoid");
const { isAdminMachine } = require("../utils/verifyAdminUtils");

const getLicenses = async (req, res) => {
  const encryptedMachineId = req.headers["x-encrypted-machine-id"];

  if (!encryptedMachineId) {
    return res.status(400).json({ message: "No machine ID provided" });
  }

  try {
    const isAdmin = isAdminMachine(encryptedMachineId);
    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: "Access Denied: Unauthorized machine ID" });
    }

    // Fetch and return licenses if verified
    const licenses = await License.find();
    res.json(licenses);
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const getLicensesById = async (req, res) => {
  try {
    const license = await License.findById(req.params.id);
    if (!license) return res.status(404).json({ message: "License not found" });
    res.json(license);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const createLicense = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(404).json({ message: "Potrebno ime" });
  }
  try {
    const newLicense = new License({
      name,
      licenseUsed: false,
      machineId: "",
      date: new Date(),
      license: nanoid(),
    });

    await newLicense.save();

    res.status(201).json(newLicense);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const deleteLicense = async (req, res) => {
  const { licenseKey } = req.params;
  const { encryptedMachineId } = req.body;

  if (!encryptedMachineId) {
    return res.status(400).json({ message: "Missing encrypted machine ID" });
  }

  try {
    const deletedLicense = await License.findOneAndDelete({
      license: licenseKey,
    });

    if (!deletedLicense) {
      return res.status(404).json({ message: "Licenca nije pronađena" });
    }

    res
      .status(200)
      .json({ message: "Uspješno izbrisana licenca", deletedLicense });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const authorizeLicense = async (req, res) => {
  const { licenseKey } = req.params;
  const { deviceId } = req.body;

  try {
    const license = await License.findOne({ license: licenseKey });

    if (!license) {
      return res.status(404).json({ message: "Licenca nije pronađena" });
    }

    if (license.licenseUsed) {
      if (license.machineId === deviceId) {
        return res.status(200).json({ message: "Licenca je već autorizirana" });
      } else {
        return res
          .status(400)
          .json({ message: "Licenca za ovaj uredaj je vec iskoristena" });
      }
    }

    license.machineId = deviceId;
    license.licenseUsed = true;
    await license.save();

    res.status(200).json({
      message: "Licenca uspješno autorizirana",
      license,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const checkDeviceRegistration = async (req, res) => {
  const { deviceId } = req.body;

  console.log("Received request to check device registration");
  console.log("Device ID:", deviceId);

  if (!deviceId) {
    return res.status(400).json({ message: "Device ID is required" });
  }

  try {
    const license = await License.findOne({ machineId: deviceId });

    if (!license) {
      console.log("No license found for the given Device ID");
      return res.status(200).json({ registered: false });
    }

    if (license.licenseUsed && license.machineId === deviceId) {
      console.log("Device is registered");
      return res.status(200).json({ registered: true });
    }

    console.log("Device is not registered");
    return res.status(200).json({ registered: false });
  } catch (err) {
    console.error("Error checking device registration:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = {
  getLicenses,
  getLicensesById,
  createLicense,
  deleteLicense,
  authorizeLicense,
  checkDeviceRegistration,
};
