const { isAdminMachine } = require("../utils/verifyAdminUtils");

const checkAdminAccess = (req, res) => {
  const { encryptedMachineId } = req.body;

  console.log("Received encryptedMachineId:", encryptedMachineId);

  if (!encryptedMachineId) {
    return res.status(400).json({ message: "No machine ID provided" });
  }

  try {
    const isAdmin = isAdminMachine(encryptedMachineId);
    return res.status(200).json({ isAdmin });
  } catch (err) {
    return res
      .status(400)
      .json({ message: "Invalid encryption", error: err.message });
  }
};

module.exports = {
  checkAdminAccess,
};
