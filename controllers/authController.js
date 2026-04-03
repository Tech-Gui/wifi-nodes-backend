const User = require("../models/User");

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing username, email, or password" });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(409).json({ error: "Username or email already exists" });
    }

    const user = new User({
      username,
      email,
      passwordHash: User.hashPassword(password),
    });
    await user.save();

    console.log(`[Auth] User registered: ${username}`);
    res.status(201).json({
      success: true,
      data: {
        username: user.username,
        email: user.email,
        apiKey: user.apiKey,
      },
      message: "User registered. Save your API key — use it in the x-api-key header.",
    });
  } catch (error) {
    res.status(500).json({ error: "Registration failed", message: error.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const user = await User.findOne({ username });
    if (!user || !user.verifyPassword(password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        email: user.email,
        apiKey: user.apiKey,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Login failed", message: error.message });
  }
};

// POST /api/auth/regenerate-key  (requires x-api-key)
exports.regenerateKey = async (req, res) => {
  try {
    const crypto = require("crypto");
    req.user.apiKey = "mash_" + crypto.randomBytes(24).toString("hex");
    await req.user.save();

    res.json({
      success: true,
      data: { apiKey: req.user.apiKey },
      message: "API key regenerated. Update all your ESP32 nodes.",
    });
  } catch (error) {
    res.status(500).json({ error: "Key regeneration failed", message: error.message });
  }
};
