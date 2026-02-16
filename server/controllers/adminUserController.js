const bcrypt = require("bcryptjs");
const { User } = require("../models");

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  priority: user.priority,
  department: user.department,
  isPaused: Boolean(user.isPaused),
  pausedAt: user.pausedAt || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase().trim();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
};

const getActiveAdminCount = async () =>
  User.countDocuments({ role: "admin", $or: [{ isPaused: false }, { isPaused: { $exists: false } }] });

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({
      users: users.map((user) => sanitizeUser(user)),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, department } = req.body;

    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ message: "name, email, phone, password and role are required" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      password: hashedPassword,
      role,
      department: department ? String(department).trim() : "",
      isPaused: false,
      pausedAt: null,
    });

    return res.status(201).json({
      message: "User account created",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const setUserPauseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const pausedValue = normalizeBoolean(req.body?.paused);
    if (pausedValue === null) {
      return res.status(400).json({ message: "paused must be a boolean value" });
    }

    if (String(req.user._id) === String(id) && pausedValue) {
      return res.status(400).json({ message: "You cannot pause your own account" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (pausedValue && user.role === "admin" && !user.isPaused) {
      const activeAdminCount = await getActiveAdminCount();
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: "Cannot pause the last active admin account" });
      }
    }

    user.isPaused = pausedValue;
    user.pausedAt = pausedValue ? new Date() : null;
    await user.save();

    return res.status(200).json({
      message: pausedValue ? "User account paused" : "User account resumed",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: "newPassword must be at least 6 characters" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      const activeAdminCount = await getActiveAdminCount();
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: "Cannot delete the last active admin account" });
      }
    }

    await User.deleteOne({ _id: id });
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getUsers,
  createUser,
  setUserPauseStatus,
  resetUserPassword,
  deleteUser,
};
