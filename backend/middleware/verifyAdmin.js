const { isAdminMachine } = require("../utils/verifyAdminUtils");

const verifyAdmin = (req, res, next) => {
  const encryptedMachineId = req.headers["x-encrypted-machine-id"];
  console.log("middleware", encryptedMachineId);

  if (!encryptedMachineId) {
    return res.status(400).json({ message: "No machine ID provided" });
  }

  try {
    if (isAdminMachine(encryptedMachineId)) {
      next(); // Proceed to the next middleware or route handler
    } else {
      return res.status(403).json({ message: "Access Denied" });
    }
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

module.exports = verifyAdmin;
