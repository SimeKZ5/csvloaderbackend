require("dotenv").config();

const ADMIN_MACHINE_ID = process.env.ADMIN_MACHINE_ID;

function isAdminMachine(machineId) {
  try {
    // Directly compare the provided machineId with the ADMIN_MACHINE_ID
    return machineId === ADMIN_MACHINE_ID;
  } catch (err) {
    throw new Error("Machine ID verification failed.");
  }
}

module.exports = {
  isAdminMachine,
};
