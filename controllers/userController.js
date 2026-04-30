const User = require("../models/User");

/**
 * GET /api/user/profile
 */
exports.getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        username: req.user.username,
        email: req.user.email,
        apiKey: req.user.apiKey,
        createdAt: req.user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile", message: err.message });
  }
};

/**
 * PATCH /api/user/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body;
    const user = req.user;

    if (username) user.username = username;
    if (email) user.email = email;

    await user.save();

    res.json({
      success: true,
      data: {
        username: user.username,
        email: user.email,
        apiKey: user.apiKey,
      },
      message: "Profile updated successfully",
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Username or email already in use" });
    }
    res.status(500).json({ error: "Profile update failed", message: err.message });
  }
};

/**
 * PATCH /api/user/password
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required" });
    }

    if (!user.verifyPassword(currentPassword)) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    user.passwordHash = User.hashPassword(newPassword);
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    res.status(500).json({ error: "Password update failed", message: err.message });
  }
};
