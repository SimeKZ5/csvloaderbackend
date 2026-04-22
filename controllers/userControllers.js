const User = require("../models/userSchema");

const SAFE_USER_FIELDS = "_id name email date role";

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select(SAFE_USER_FIELDS).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select(SAFE_USER_FIELDS)
      .lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
};
